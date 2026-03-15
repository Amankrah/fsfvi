/**
 * Rwanda FSFSI API Clients
 * ========================
 * Central export for all API clients
 *
 * Backend: Rwanda Django backend (http://localhost:8000)
 */

export { authAPI } from './authApi';
export { assessmentAPI } from './assessmentApi';
export { optimizationAPI } from './optimizationApi';
export { planningAPI } from './planningApi';
export { performanceGapAPI } from './performanceGapApi';
export { weightingAPI } from './weightingApi';

// Re-export types
export type * from '@/lib/types/auth';
export type * from '@/lib/types/assessment';
export type * from '@/lib/types/optimization';
export type * from '@/lib/types/planning';
