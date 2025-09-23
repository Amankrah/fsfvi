# Dummy Data Feature

## Overview

The FSFVI analysis platform now includes a "Use Dummy Data" feature that allows users to test the analysis capabilities without uploading their own data. This is perfect for:

- Exploring the platform's features
- Demonstrating the analysis workflow
- Testing different scenarios
- Learning how the system works

## How to Use

### 1. Access the Feature

1. Log into the FSFVI platform
2. Click "Start New Analysis" on the dashboard
3. In the dialog, select "Use Dummy Data (Test Mode)"
4. Fill in the analysis details (country name, fiscal year, etc.)
5. Click "Load Sample Data"

### 2. What Happens

When you select dummy data mode:

- The system loads a curated sample dataset
- The data is processed through the same pipeline as real data
- You can perform all the same analyses as with real data
- Results are clearly marked as test data

### 3. Sample Data Structure

The dummy data includes:

- **Projects**: Various food system projects across different sectors
- **Subsectors**: Environmental impacts, Food safety, Economic, Resilience, etc.
- **Indicators**: Performance metrics and benchmarks
- **Values**: Realistic but modified figures for demonstration

## Technical Implementation

### Backend Endpoints

#### FastAPI (Port 8001)
- `GET /dummy_data` - Serves the dummy data file

#### Django (Port 8000)
- `POST /django-api/upload-dummy-data/` - Processes dummy data upload

### Frontend Components

- `NewAnalysisDialog` - Updated to include dummy data option
- `dataAPI.uploadDummyData()` - New API function for dummy data

### Data File

- Location: `docs/dummy_data_sample.csv`
- Contains modified versions of real data with clear "Sample" prefixes
- Maintains the same structure as real data for compatibility

## Benefits

1. **User Experience**: Users can immediately explore the platform
2. **Demonstration**: Perfect for showcasing capabilities
3. **Testing**: Developers can test features without real data
4. **Learning**: New users can understand the workflow
5. **Safety**: No risk of exposing sensitive real data

## Data Privacy

- Dummy data is completely separate from real user data
- No real country or project information is used
- All values are modified to be clearly identifiable as test data
- No personal or sensitive information is included

## Future Enhancements

Potential improvements to consider:

1. **Multiple Scenarios**: Different dummy datasets for different use cases
2. **Customizable Data**: Allow users to modify dummy data parameters
3. **Tutorial Mode**: Step-by-step guided analysis with dummy data
4. **Export Results**: Allow users to export dummy analysis results
5. **Comparison Mode**: Compare dummy results with real data examples

## Usage Guidelines

### For Users
- Use dummy data to explore the platform
- Understand the analysis workflow
- Test different scenarios
- Learn about food system vulnerability analysis

### For Developers
- Test new features with dummy data
- Validate the analysis pipeline
- Ensure data processing works correctly
- Debug issues without real data concerns

### For Administrators
- Demonstrate platform capabilities
- Train new users
- Showcase features to stakeholders
- Test system performance

## File Structure

```
docs/
├── dummy_data_sample.csv          # Main dummy data file
├── Final_Combined_Matches_with_Manual_Entries.csv  # Original data
└── DUMMY_DATA_FEATURE.md         # This documentation
```

## API Integration

The dummy data feature integrates seamlessly with the existing API:

```typescript
// Frontend usage
const result = await dataAPI.uploadDummyData(formData);

// Backend processing
// Same pipeline as real data upload
// Results in same session structure
// Compatible with all analysis endpoints
```

## Security Considerations

- Dummy data is served from a controlled file
- No user input is used to generate dummy data
- File access is restricted to authenticated users
- No real data is ever mixed with dummy data
- Clear labeling prevents confusion with real data 