"""
Django Data Processing Service for FSFVI
Handles CSV upload, processing, and database storage
"""

import os
import uuid
import tempfile
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import logging

# Import the data preparation logic from local module
try:
    from .data_preparation import UniversalFSFVIDataPreparation
    DATA_PREPARATION_AVAILABLE = True
    print("Data preparation module loaded successfully")
except ImportError:
    print("Warning: data_preparation module not available")
    DATA_PREPARATION_AVAILABLE = False

from .models import FSFVISession, Component, UploadedFile

logger = logging.getLogger(__name__)

class DataProcessingService:
    """Service for handling CSV upload and processing"""
    
    def __init__(self):
        self.base_upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploaded_csv')
        self.ensure_upload_directory()
    
    def ensure_upload_directory(self):
        """Ensure the upload directory exists"""
        os.makedirs(self.base_upload_dir, exist_ok=True)
    
    def get_user_upload_dir(self, user_id: int) -> str:
        """Get or create user-specific upload directory"""
        user_dir = os.path.join(self.base_upload_dir, str(user_id))
        os.makedirs(user_dir, exist_ok=True)
        return user_dir
    
    def upload_and_process_csv(
        self, 
        user: User, 
        file_content: bytes, 
        filename: str,
        country_name: str,
        fiscal_year: int = 2024,
        currency: str = "USD",
        budget_unit: str = "millions"
    ) -> Dict[str, Any]:
        """
        Upload CSV file and process it into database records
        
        Returns:
            Dict with session_id, processing status, and summary
        """
        try:
            # Save the uploaded file
            uploaded_file = self._save_uploaded_file(user, file_content, filename)
            
            # Create a session
            session = self._create_session(
                user, country_name, fiscal_year, currency, budget_unit
            )
            
            # Link uploaded file to session
            uploaded_file.session = session
            uploaded_file.save()
            
            # Process the CSV file
            processing_result = self._process_csv_file(uploaded_file, session)
            
            if processing_result['success']:
                return {
                    'success': True,
                    'session_id': str(session.id),
                    'uploaded_file_id': str(uploaded_file.id),
                    'message': f"Successfully processed data for {country_name}",
                    'summary': processing_result['summary'],
                    'components': processing_result['components_summary']
                }
            else:
                # Update file status to error
                uploaded_file.processing_status = 'error'
                uploaded_file.error_message = processing_result['error']
                uploaded_file.save()
                
                return {
                    'success': False,
                    'error': processing_result['error'],
                    'session_id': str(session.id),
                    'uploaded_file_id': str(uploaded_file.id)
                }
                
        except Exception as e:
            logger.error(f"Error in upload_and_process_csv: {str(e)}")
            return {
                'success': False,
                'error': f"Processing failed: {str(e)}"
            }
    
    def _save_uploaded_file(self, user: User, file_content: bytes, filename: str) -> UploadedFile:
        """Save uploaded file to user directory"""
        # Create user upload directory
        user_dir = self.get_user_upload_dir(user.id)
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_id = str(uuid.uuid4())[:8]
        safe_filename = f"{timestamp}_{file_id}_{filename}"
        file_path = os.path.join(user_dir, safe_filename)
        
        # Save file to disk
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Create database record
        uploaded_file = UploadedFile.objects.create(
            user=user,
            original_filename=filename,
            file_path=file_path,
            file_size=len(file_content),
            processing_status='uploaded'
        )
        
        logger.info(f"Saved file {filename} for user {user.id} to {file_path}")
        return uploaded_file
    
    def _create_session(
        self,
        user: User,
        country_name: str,
        fiscal_year: int,
        currency: str,
        budget_unit: str
    ) -> FSFVISession:
        """Create a new FSFVI session"""
        session = FSFVISession.objects.create(
            user=user,
            country_name=country_name,
            fiscal_year=fiscal_year,
            currency=currency,
            budget_unit=budget_unit,
            total_budget=0,  # Will be updated after processing
            status='processing'
        )
        
        logger.info(f"Created session {session.id} for user {user.id}")
        return session
    
    def _process_csv_file(self, uploaded_file: UploadedFile, session: FSFVISession) -> Dict[str, Any]:
        """Process the uploaded CSV file using data_preparation logic"""
        try:
            # Update file status
            uploaded_file.processing_status = 'processing'
            uploaded_file.save()
            
            if not DATA_PREPARATION_AVAILABLE:
                return {
                    'success': False,
                    'error': 'Data preparation module not available'
                }
            
            # Initialize data preparation with the uploaded file
            prep = UniversalFSFVIDataPreparation(uploaded_file.file_path)
            
            # Load and clean data
            prep.load_and_clean_data()
            
            # Get data summary
            data_summary = prep.get_data_summary()
            
            # Prepare component data
            components_data, calculated_total_budget = prep.prepare_component_data(session.country_name)
            
            # Validate against system
            validation_results = prep.validate_against_system(components_data)
            
            # Create component records in database
            self._create_components(session, components_data)
            
            # Recalculate total budget from actual component allocations to ensure consistency
            actual_total_budget = sum(comp_data['financial_allocation'] for comp_data in components_data)
            
            # Update session with the actual total budget from components
            logger.info(f"Data Processing Service: Calculated budget: ${calculated_total_budget:.1f}M, Actual component sum: ${actual_total_budget:.1f}M")
            session.total_budget = actual_total_budget
            session.status = 'data_processed'
            session.save()
            
            # Update uploaded file with processing results
            uploaded_file.processing_status = 'processed'
            uploaded_file.total_records = data_summary['total_records']
            uploaded_file.component_types_found = data_summary['component_types']
            uploaded_file.data_quality_score = data_summary['data_quality'].get('missing_values', 0) / max(data_summary['total_records'], 1)
            uploaded_file.processing_log = f"Successfully processed {len(components_data)} components. " + \
                                         f"Validation: {validation_results['status']}"
            uploaded_file.save()
            
            return {
                'success': True,
                'summary': {
                    'total_records': data_summary['total_records'],
                    'total_budget': actual_total_budget,
                    'components_count': len(components_data),
                    'data_quality_score': uploaded_file.data_quality_score,
                    'validation_status': validation_results['status'],
                    'alignment_status': data_summary['alignment_status']
                },
                'components_summary': [
                    {
                        'component_type': comp['component_type'],
                        'component_name': comp['component_name'],
                        'allocation': comp['financial_allocation'],
                        'sensitivity_parameter': comp['sensitivity_parameter']
                    }
                    for comp in components_data
                ]
            }
            
        except Exception as e:
            logger.error(f"Error processing CSV file: {str(e)}")
            uploaded_file.processing_status = 'error'
            uploaded_file.error_message = str(e)
            uploaded_file.save()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_components(self, session: FSFVISession, components_data: List[Dict]) -> None:
        """Create component records in the database"""
        components_to_create = []
        
        for comp_data in components_data:
            component = Component(
                session=session,
                component_id=comp_data.get('component_id', uuid.uuid4()),
                component_name=comp_data['component_name'],
                component_type=comp_data['component_type'],
                observed_value=comp_data['observed_value'],
                benchmark_value=comp_data['benchmark_value'],
                financial_allocation=comp_data['financial_allocation'],
                weight=comp_data['weight'],
                sensitivity_parameter=comp_data['sensitivity_parameter']
            )
            components_to_create.append(component)
        
        # Bulk create components
        Component.objects.bulk_create(components_to_create)
        
        # Verify total allocation
        total_allocation = sum(comp_data['financial_allocation'] for comp_data in components_data)
        logger.info(f"Created {len(components_to_create)} components for session {session.id}, total allocation: ${total_allocation:.1f}M")
    
    def get_user_files(self, user: User) -> List[Dict[str, Any]]:
        """Get all uploaded files for a user"""
        files = UploadedFile.objects.filter(user=user).order_by('-uploaded_at')
        
        return [
            {
                'id': str(file.id),
                'original_filename': file.original_filename,
                'uploaded_at': file.uploaded_at.isoformat(),
                'processing_status': file.processing_status,
                'file_size': file.file_size,
                'session_id': str(file.session.id) if file.session else None,
                'total_records': file.total_records,
                'data_quality_score': file.data_quality_score,
                'error_message': file.error_message
            }
            for file in files
        ]
    
    def get_session_with_file_info(self, session_id: str, user: User) -> Optional[Dict[str, Any]]:
        """Get session information including uploaded file details"""
        try:
            session = FSFVISession.objects.get(id=session_id, user=user)
            
            session_data = {
                'id': str(session.id),
                'country_name': session.country_name,
                'fiscal_year': session.fiscal_year,
                'currency': session.currency,
                'budget_unit': session.budget_unit,
                'total_budget': session.total_budget,
                'status': session.status,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat(),
                'uploaded_file': None
            }
            
            # Add uploaded file info if exists
            if hasattr(session, 'uploaded_file') and session.uploaded_file:
                file = session.uploaded_file
                session_data['uploaded_file'] = {
                    'id': str(file.id),
                    'original_filename': file.original_filename,
                    'uploaded_at': file.uploaded_at.isoformat(),
                    'processing_status': file.processing_status,
                    'file_size': file.file_size,
                    'total_records': file.total_records,
                    'data_quality_score': file.data_quality_score
                }
            
            return session_data
            
        except FSFVISession.DoesNotExist:
            return None
    
    def delete_file_and_session(self, session_id: str, user: User) -> bool:
        """Delete uploaded file and associated session"""
        try:
            session = FSFVISession.objects.get(id=session_id, user=user)
            
            # Delete physical file if exists
            if hasattr(session, 'uploaded_file') and session.uploaded_file:
                session.uploaded_file.delete_file()
            
            # Delete session (cascade will handle related records)
            session.delete()
            
            logger.info(f"Deleted session {session_id} and associated file for user {user.id}")
            return True
            
        except FSFVISession.DoesNotExist:
            return False
    
    def reprocess_file(self, session_id: str, user: User) -> Dict[str, Any]:
        """Reprocess an uploaded file"""
        try:
            session = FSFVISession.objects.get(id=session_id, user=user)
            
            if not hasattr(session, 'uploaded_file') or not session.uploaded_file:
                return {
                    'success': False,
                    'error': 'No uploaded file found for this session'
                }
            
            uploaded_file = session.uploaded_file
            
            # Check if file still exists
            if not os.path.exists(uploaded_file.file_path):
                return {
                    'success': False,
                    'error': 'Original file no longer exists'
                }
            
            # Clear existing components
            session.components.all().delete()
            
            # Reprocess the file
            processing_result = self._process_csv_file(uploaded_file, session)
            
            return processing_result
            
        except FSFVISession.DoesNotExist:
            return {
                'success': False,
                'error': 'Session not found'
            }

# Singleton instance
data_processing_service = DataProcessingService() 