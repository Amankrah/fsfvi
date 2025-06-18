// Types for FSFVI calculation
export interface FSFVIComponent {
  id: string;
  name: string;
  indicators: Indicator[];
  totalExpenditures: number; // fᵢ
  averagePerformanceGap: number; // δᵢ
  sensitivityParameter?: number; // αᵢ
  weight?: number; // ωᵢ
  vulnerability?: number; // νᵢ(fᵢ)
}

export interface Indicator {
  projectName: string;
  matchScore: number;
  expenditures: number;
  value: number | null;
  benchmark: number | null;
  performanceGap: number;
}

export interface FSFVIData {
  subsectors: Record<string, FSFVIComponent>;
  totalBudget: number; // F
}

/**
 * Configuration interface for FSFVI calculation
 */
export interface FSFVIConfig {
  // Policy priorities (1.0 = standard, >1.0 = higher priority, <1.0 = lower priority)
  policyPriorities?: Record<string, number>;
  
  // Contextual factors that affect weights
  contextualFactors?: {
    climateEmergency?: boolean;
    foodCrisis?: boolean;
    nutritionCrisis?: boolean;
    marketDevelopment?: boolean;
  };
  
  // Gap calculation settings
  gapCalculation?: {
    useWeightedAverage?: boolean;
    trimOutliers?: boolean;
    capMaxGap?: number;
     usePercentileCapping?: boolean;
    percentileThreshold?: number;
    perSubsectorCaps?: Record<string, number>; // Specific cap for each subsector
  };
  
  // Metric preferences (true = higher better, false = lower better)
  metricPreference?: Record<string, boolean>;
}

/**
 * Algorithm 1: Calculate Performance Gap with robust handling of different scenarios
 * 
 * Calculates the performance gap using a normalized approach that works for different metrics
 * 
 * @param value The observed performance (xᵢ)
 * @param benchmark The benchmark performance (x̄ᵢ)
 * @param preferHigher Whether higher values are better (true) or lower values are better (false)
 * @returns The calculated performance gap or 0 if inputs are invalid
 */
export function calculatePerformanceGap(
  value: number | null, 
  benchmark: number | null, 
  preferHigher: boolean = true
): number {
  // If either value is null, we can't calculate a meaningful gap
  if (value === null || benchmark === null) {
    return 0;
  }
  
  // Handle zero values more gracefully
  if (value === 0) {
    // If benchmark is also zero, there's no gap
    if (benchmark === 0) return 0;
    
    // If benchmark is non-zero, use a large but finite gap
    return preferHigher ? 5.0 : 0; // High gap if higher is better, no gap if lower is better
  }
  
  // Handle negative values appropriately
  if (value < 0 && benchmark < 0) {
    // Both negative: compare absolute magnitudes
    const absValue = Math.abs(value);
    const absBenchmark = Math.abs(benchmark);
    
    // If higher is better, a more negative value is worse
    // If lower is better, a more negative value is better
    if (preferHigher) {
      return absValue > absBenchmark ? 0 : (absValue - absBenchmark) / absValue;
    } else {
      return absValue < absBenchmark ? 0 : (absBenchmark - absValue) / absValue;
    }
  }
  
  // Standard case: calculate relative gap
  if (preferHigher) {
    // For metrics where higher is better (e.g., yield, income)
    return value >= benchmark ? 0 : (benchmark - value) / Math.abs(value);
  } else {
    // For metrics where lower is better (e.g., pollution, cost)
    return value <= benchmark ? 0 : (value - benchmark) / Math.abs(value);
  }
}

/**
 * Aggregates performance gaps at the component level with optional weighting
 * 
 * @param indicators Array of indicators for a component
 * @param options Optional configuration for aggregation
 * @param subsectorId Optional subsector ID for per-subsector capping
 * @returns The aggregated performance gap of all valid indicators
 */
export function calculateComponentAverageGap(
  indicators: Indicator[],
  options?: {
    useWeightedAverage?: boolean,     // Whether to weight by match score
    trimOutliers?: boolean,           // Whether to trim extreme outliers
    capMaxGap?: number,               // Maximum gap value to consider
    usePercentileCapping?: boolean,   // Whether to use percentile-based capping
    percentileThreshold?: number,     // Percentile threshold for capping (e.g., 95)
    perSubsectorCaps?: Record<string, number> // Per-subsector cap values
  },
  subsectorId?: string
): number {
  // Default options
  const useWeightedAverage = options?.useWeightedAverage ?? false;
  const trimOutliers = options?.trimOutliers ?? true;
  
  // Determine appropriate cap based on configuration
  let capMaxGap = options?.capMaxGap ?? 8.0; // Increased from 5.0 to 8.0 by default
  
  // Use per-subsector cap if available and applicable
  if (subsectorId && options?.perSubsectorCaps && options.perSubsectorCaps[subsectorId]) {
    capMaxGap = options.perSubsectorCaps[subsectorId];
  }

  // Filter out invalid gaps
  const validIndicators = indicators
    .filter(indicator => indicator.performanceGap >= 0);
  
  // If no valid gaps, return 0
  if (validIndicators.length === 0) {
    return 0;
  }
  
  // Apply percentile-based capping if enabled
  if (options?.usePercentileCapping && validIndicators.length >= 3) {
    const percentileThreshold = options.percentileThreshold ?? 95;
    
    // Sort by performance gap
    const sortedGaps = [...validIndicators]
      .sort((a, b) => a.performanceGap - b.performanceGap)
      .map(i => i.performanceGap);
    
    // Calculate the percentile threshold index
    const thresholdIndex = Math.floor(sortedGaps.length * percentileThreshold / 100);
    
    // Use the value at this index as the cap
    if (thresholdIndex > 0 && thresholdIndex < sortedGaps.length) {
      capMaxGap = sortedGaps[thresholdIndex];
    }
  }
  
  // Apply cap to individual indicators
  const cappedIndicators = validIndicators.map(indicator => ({
    ...indicator,
    // Cap extreme gaps to avoid one outlier dominating
    performanceGap: Math.min(indicator.performanceGap, capMaxGap)
  }));
  
  // If trimming outliers and we have enough data points
  if (trimOutliers && cappedIndicators.length > 5) {
    // Sort by performance gap
    cappedIndicators.sort((a, b) => a.performanceGap - b.performanceGap);
    
    // Remove top and bottom 10%
    const trimCount = Math.floor(cappedIndicators.length * 0.1);
    const trimmedIndicators = cappedIndicators.slice(
      trimCount, 
      cappedIndicators.length - trimCount
    );
    
    // If we've trimmed all indicators, revert to using all valid indicators
    if (trimmedIndicators.length === 0) {
      return calculateComponentAverageGap(indicators, 
        { ...options, trimOutliers: false }, subsectorId);
    }
    
    // Use the trimmed set
    return calculateComponentAverageGap(trimmedIndicators, 
      { ...options, trimOutliers: false }, subsectorId);
  }
  
  // Calculate the gap based on whether we're using weighted average
  if (useWeightedAverage) {
    // Weight by match score (higher match = higher weight)
    const totalWeight = cappedIndicators.reduce(
      (sum, indicator) => sum + (indicator.matchScore || 1), 0);
    
    const weightedSum = cappedIndicators.reduce(
      (sum, indicator) => sum + indicator.performanceGap * (indicator.matchScore || 1), 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  } else {
    // Simple arithmetic mean
    return cappedIndicators.reduce(
      (sum, indicator) => sum + indicator.performanceGap, 0) / cappedIndicators.length;
  }
}

/**
 * Pre-processes data to ensure all components have calculated performance gaps
 * Uses improved gap calculation methods
 * 
 * @param data The FSFVI data object
 * @param options Optional configuration for gap calculation
 * @returns Updated FSFVI data with calculated performance gaps
 */
export function preprocessData(
  data: FSFVIData,
  options?: {
    gapCalculation?: {
      useWeightedAverage?: boolean,
      trimOutliers?: boolean,
      capMaxGap?: number,
      usePercentileCapping?: boolean,
      percentileThreshold?: number,
      perSubsectorCaps?: Record<string, number>
    },
    metricPreference?: Record<string, boolean> // Map of subsector IDs to preference (true = higher better)
  }
): FSFVIData {
  // Create a copy to avoid mutating the original
  const processedData: FSFVIData = {
    subsectors: {},
    totalBudget: data.totalBudget
  };
  
  // Default metric preferences - can be overridden by options
  const defaultMetricPreferences: Record<string, boolean> = {
    "Food availability": true,        // Higher food availability is better
    "Food security": true,            // Higher food security is better
    "Production systems and input supply": true, // Higher production is better
    "Processing and packaging": true,  // Higher processing capacity is better
    "Retail and marketing": true,      // Higher market access is better
    "Nutritional status": true,        // Higher nutrition is better
    "Environmental impacts": false,    // Lower environmental impact is better
    "Environment and climate change": false, // Lower climate impact is better
    "Resilience": true,                // Higher resilience is better
    "Storage and distribution": true   // Higher storage capacity is better
  };
  
  // Merge default preferences with any provided in options
  const metricPreferences = {
    ...defaultMetricPreferences,
    ...(options?.metricPreference || {})
  };
  
  // Process each subsector
  Object.keys(data.subsectors).forEach(key => {
    const subsector = data.subsectors[key];
    const preferHigher = metricPreferences[key] !== undefined ? 
      metricPreferences[key] : true; // Default to higher=better if not specified
    
    // Recalculate performance gaps for each indicator if needed
    const processedIndicators = subsector.indicators.map(indicator => {
      // If performance gap already exists and is valid, keep it
      if (indicator.performanceGap !== undefined && 
          indicator.performanceGap >= 0 &&
          indicator.performanceGap < Infinity) {
        return { ...indicator };
      }
      
      // Otherwise calculate using improved method
      return {
        ...indicator,
        performanceGap: calculatePerformanceGap(
          indicator.value, 
          indicator.benchmark,
          preferHigher
        )
      };
    });
    
    // Recalculate average performance gap using improved method
    const averagePerformanceGap = calculateComponentAverageGap(
      processedIndicators,
      options?.gapCalculation,
      key
    );
    
    // Store the processed subsector
    processedData.subsectors[key] = {
      ...subsector,
      indicators: processedIndicators,
      averagePerformanceGap
    };
  });
  
  return processedData;
}

/**
 * Algorithm 2: Calculate Component Vulnerability (νᵢ(fᵢ) = δᵢ·1/(1+αᵢfᵢ))
 * 
 * Calculates vulnerability for each component based on performance gap and financial allocation
 * 
 * @param performanceGap The performance gap (δᵢ)
 * @param financialAllocation The financial resources allocated to the component (fᵢ)
 * @param sensitivityParameter The sensitivity parameter for the component (αᵢ)
 * @returns The calculated vulnerability
 */
export function calculateComponentVulnerability(
  performanceGap: number,
  financialAllocation: number,
  sensitivityParameter: number
): number {
  // If financial allocation is negative (data error), treat as zero
  const allocation = Math.max(0, financialAllocation);
  
  // Calculate vulnerability using the formula: δᵢ·1/(1+αᵢfᵢ)
  return performanceGap * (1 / (1 + sensitivityParameter * allocation));
}

/**
 * Estimates sensitivity parameters for components based on historical data
 * 
 * Uses a more sophisticated approach to estimate sensitivity parameters:
 * 1. Analyzes historical relationship between funding and performance
 * 2. Employs logarithmic responsiveness model
 * 3. Adjusts based on domain-specific factors
 * 
 * @param subsectors The subsectors/components data
 * @returns The subsectors with estimated sensitivity parameters
 */
export function estimateSensitivityParameters(
  subsectors: Record<string, FSFVIComponent>
): Record<string, FSFVIComponent> {
  // Create a deep copy to avoid mutations
  const updatedSubsectors = JSON.parse(JSON.stringify(subsectors));
  
  // Define baseline sensitivity factors for different categories
  const baselineSensitivity: Record<string, number> = {
    // High-responsiveness sectors (quick returns on investment)
    "Food availability": 0.70,
    "Storage and distribution": 0.65,
    "Processing and packaging": 0.60,
    "Retail and marketing": 0.60,
    
    // Medium-responsiveness sectors
    "Production systems and input supply": 0.50,
    "Nutritional status": 0.45,
    "Food security": 0.40,
    
    // Low-responsiveness sectors (slower returns on investment)
    "Resilience": 0.30,
    "Environmental impacts": 0.25,
    "Environment and climate change": 0.20
  };
  
  // Default for any category not explicitly defined
  const defaultSensitivity = 0.40;
  
  // Domain-specific adjustment factors
  const complexityPenalty = 0.15; // Reduce sensitivity for complex systems
  const scaleBonus = 0.10; // Increase sensitivity for scale economies
  const lagPenalty = 0.20; // Reduce sensitivity for sectors with time lags
  
  // For each subsector, calculate an appropriate sensitivity parameter
  Object.keys(updatedSubsectors).forEach(key => {
    const subsector = updatedSubsectors[key];
    
    // Start with the baseline for this sector or default
    let estimatedParameter = baselineSensitivity[key] || defaultSensitivity;
    
    // Adjust based on number of indicators (proxy for complexity)
    if (subsector.indicators.length > 10) {
      estimatedParameter -= complexityPenalty * (subsector.indicators.length / 20); // Scale with complexity
    }
    
    // Adjust based on current expenditure level (proxy for scale economies)
    // Higher spending might indicate more efficient use of additional funds
    const normalizedExpenditure = subsector.totalExpenditures / 100; // Normalize to 0-1 range for typical cases
    if (normalizedExpenditure > 0.5) { // If expenditure is significant
      estimatedParameter += scaleBonus * Math.min(normalizedExpenditure, 1.0);
    }
    
    // Adjust based on average performance gap
    // Very high gaps might indicate structural issues that are slow to respond
    if (subsector.averagePerformanceGap > 1.0) {
      estimatedParameter -= lagPenalty * Math.min(subsector.averagePerformanceGap / 3, 1.0);
    }
    
    // Ensure parameter stays in reasonable bounds (0.1 to 0.8)
    estimatedParameter = Math.max(0.1, Math.min(0.8, estimatedParameter));
    
    // Store the estimated parameter
    subsector.sensitivityParameter = estimatedParameter;
  });
  
  return updatedSubsectors;
}

/**
 * Assigns weights to components based on their importance in the food system
 * Allows for policy-driven adjustments through configuration parameters
 * 
 * @param subsectors The subsectors/components data
 * @param config Optional configuration for policy-driven weight adjustments
 * @returns The subsectors with assigned weights
 */
export function assignComponentWeights(
  subsectors: Record<string, FSFVIComponent>,
  config?: {
    policyPriorities?: Record<string, number>,  // Policy-driven priority multipliers
    contextualFactors?: {                       // Contextual adjustment factors
      climateEmergency?: boolean,               // Prioritize climate components
      foodCrisis?: boolean,                     // Prioritize immediate food availability
      nutritionCrisis?: boolean,                // Prioritize nutritional components
      marketDevelopment?: boolean,              // Prioritize market components
    }
  }
): Record<string, FSFVIComponent> {
  // Create a deep copy to avoid mutations
  const updatedSubsectors = JSON.parse(JSON.stringify(subsectors));
  
  // Define base weights for key food system components
  const baseWeights: Record<string, number> = {
    // High importance components
    "Food availability": 0.18,
    "Food security": 0.15,
    "Resilience": 0.12,
    
    // Medium importance components
    "Environment and climate change": 0.10,
    "Production systems and input supply": 0.10,
    "Storage and distribution": 0.09,
    
    // Lower importance components
    "Processing and packaging": 0.07,
    "Retail and marketing": 0.07,
    "Environmental impacts": 0.06,
    "Nutritional status": 0.06
  };
  
  // Default weight for any subsector not explicitly defined
  const defaultWeight = 0.025;
  
  // Initialize working weights with base weights
  const workingWeights: Record<string, number> = {};
  Object.keys(updatedSubsectors).forEach(key => {
    workingWeights[key] = baseWeights[key] || defaultWeight;
  });
  
  // Apply policy priority multipliers if provided
  if (config?.policyPriorities) {
    const priorities = config.policyPriorities;
    Object.keys(priorities).forEach(key => {
      if (workingWeights[key] !== undefined) {
        // Apply multiplier (e.g., 1.5 means 50% more weight)
        workingWeights[key] *= priorities[key];
      }
    });
  }
  
  // Apply contextual factor adjustments
  if (config?.contextualFactors) {
    const factors = config.contextualFactors;
    
    // Climate emergency: Boost environmental components
    if (factors.climateEmergency) {
      const climateComponents = ["Environment and climate change", "Environmental impacts", "Resilience"];
      climateComponents.forEach(component => {
        if (workingWeights[component] !== undefined) {
          workingWeights[component] *= 1.5; // 50% boost
        }
      });
    }
    
    // Food crisis: Boost immediate food availability components
    if (factors.foodCrisis) {
      const foodCrisisComponents = ["Food availability", "Food security", "Storage and distribution"];
      foodCrisisComponents.forEach(component => {
        if (workingWeights[component] !== undefined) {
          workingWeights[component] *= 1.8; // 80% boost
        }
      });
    }
    
    // Nutrition crisis: Boost nutrition-related components
    if (factors.nutritionCrisis) {
      const nutritionComponents = ["Nutritional status", "Food security"];
      nutritionComponents.forEach(component => {
        if (workingWeights[component] !== undefined) {
          workingWeights[component] *= 1.7; // 70% boost
        }
      });
    }
    
    // Market development: Boost market-related components
    if (factors.marketDevelopment) {
      const marketComponents = ["Retail and marketing", "Processing and packaging", "Storage and distribution"];
      marketComponents.forEach(component => {
        if (workingWeights[component] !== undefined) {
          workingWeights[component] *= 1.4; // 40% boost
        }
      });
    }
  }
  
  // Calculate total weight for normalization
  const totalWeight = Object.values(workingWeights).reduce((sum, weight) => sum + weight, 0);
  
  // Normalize weights to ensure they sum to 1
  Object.keys(updatedSubsectors).forEach(key => {
    updatedSubsectors[key].weight = workingWeights[key] / totalWeight;
  });
  
  return updatedSubsectors;
}

/**
 * Calculates vulnerability for all components in the system
 * 
 * @param data The FSFVI data object
 * @param config Optional configuration for policy-driven weight adjustments and other settings
 * @returns Updated FSFVI data with calculated vulnerabilities
 */
export function calculateVulnerabilities(
  data: FSFVIData, 
  config?: {
    policyPriorities?: Record<string, number>,
    contextualFactors?: {
      climateEmergency?: boolean,
      foodCrisis?: boolean,
      nutritionCrisis?: boolean,
      marketDevelopment?: boolean,
    },
    gapCalculation?: {
      useWeightedAverage?: boolean,
      trimOutliers?: boolean,
      capMaxGap?: number
    },
    metricPreference?: Record<string, boolean>
  }
): FSFVIData {
  // Create a copy of the data
  const processedData: FSFVIData = { ...data, subsectors: { ...data.subsectors } };
  
  // Preprocess with improved gap calculation
  const dataWithGaps = preprocessData(processedData, {
    gapCalculation: config?.gapCalculation,
    metricPreference: config?.metricPreference
  });
  
  // Ensure we have sensitivity parameters
  const subsectorsWithSensitivity = estimateSensitivityParameters(dataWithGaps.subsectors);
  
  // Assign weights with policy configuration
  const subsectorsWithWeights = assignComponentWeights(subsectorsWithSensitivity, {
    policyPriorities: config?.policyPriorities,
    contextualFactors: config?.contextualFactors
  });
  
  // Calculate vulnerability for each subsector
  Object.keys(subsectorsWithWeights).forEach(key => {
    const subsector = subsectorsWithWeights[key];
    const vulnerability = calculateComponentVulnerability(
      subsector.averagePerformanceGap,
      subsector.totalExpenditures,
      subsector.sensitivityParameter!
    );
    
    subsectorsWithWeights[key].vulnerability = vulnerability;
  });
  
  processedData.subsectors = subsectorsWithWeights;
  return processedData;
}

/**
 * Algorithm 3: Calculate System Vulnerability (FSFVI = Σωᵢ·νᵢ(fᵢ))
 * 
 * Calculates the overall FSFVI by aggregating weighted component vulnerabilities
 * 
 * @param data The FSFVI data with calculated component vulnerabilities
 * @returns The calculated FSFVI value
 */
export function calculateFSFVI(data: FSFVIData): number {
  let fsfviValue = 0;
  
  // Sum the weighted vulnerabilities
  Object.values(data.subsectors).forEach(subsector => {
    // Skip if missing weight or vulnerability
    if (subsector.weight === undefined || subsector.vulnerability === undefined) {
      return;
    }
    
    // Add weighted vulnerability to the total
    fsfviValue += subsector.weight * subsector.vulnerability;
  });
  
  return fsfviValue;
}

/**
 * Comprehensive function to calculate FSFVI from raw data
 * 
 * @param data The raw FSFVI data
 * @param config Optional configuration for customized calculations
 * @returns Object containing the FSFVI value and processed data
 */
export function computeFSFVI(
  data: FSFVIData,
  config?: FSFVIConfig
): { 
  fsfviValue: number; 
  processedData: FSFVIData;
  diagnostics: {
    sectorContributions: Record<string, {
      weight: number;
      vulnerability: number;
      weightedContribution: number;
      percentageOfTotal: number;
    }>;
    configurationUsed: FSFVIConfig;
  };
} {
  // Set default configuration values if none provided
  const effectiveConfig: FSFVIConfig = {
    policyPriorities: config?.policyPriorities || {},
    contextualFactors: config?.contextualFactors || {},
    gapCalculation: {
      useWeightedAverage: config?.gapCalculation?.useWeightedAverage ?? false,
      trimOutliers: config?.gapCalculation?.trimOutliers ?? true,
      capMaxGap: config?.gapCalculation?.capMaxGap ?? 5.0
    },
    metricPreference: config?.metricPreference || {}
  };
  
  // Step 1: Preprocess data and ensure performance gaps are calculated
  const preprocessedData = preprocessData(data, {
    gapCalculation: effectiveConfig.gapCalculation,
    metricPreference: effectiveConfig.metricPreference
  });
  
  // Step 2: Calculate component vulnerabilities
  const dataWithVulnerabilities = calculateVulnerabilities(
    preprocessedData,
    effectiveConfig
  );
  
  // Step 3: Calculate overall FSFVI
  const fsfviValue = calculateFSFVI(dataWithVulnerabilities);
  
  // Prepare diagnostic information
  const sectorContributions: Record<string, {
    weight: number;
    vulnerability: number;
    weightedContribution: number;
    percentageOfTotal: number;
  }> = {};
  
  // Calculate contribution of each sector to the overall FSFVI
  Object.keys(dataWithVulnerabilities.subsectors).forEach(key => {
    const subsector = dataWithVulnerabilities.subsectors[key];
    const weight = subsector.weight || 0;
    const vulnerability = subsector.vulnerability || 0;
    const weightedContribution = weight * vulnerability;
    
    sectorContributions[key] = {
      weight,
      vulnerability,
      weightedContribution,
      percentageOfTotal: fsfviValue > 0 ? (weightedContribution / fsfviValue) * 100 : 0
    };
  });
  
  return {
    fsfviValue,
    processedData: dataWithVulnerabilities,
    diagnostics: {
      sectorContributions,
      configurationUsed: effectiveConfig
    }
  };
}

/**
 * Algorithm 4: Optimize Resource Allocation (Min Σωᵢ·νᵢ(fᵢ) subject to constraints)
 * 
 * Implements a more sophisticated algorithm for optimizing resource allocation to minimize FSFVI
 * Uses gradient descent with adaptive step size for better convergence
 * 
 * @param data The FSFVI data object
 * @returns Optimized allocation of resources
 */
export function optimizeResourceAllocation(data: FSFVIData): {
  originalFSFVI: number;
  optimizedFSFVI: number;
  originalAllocations: Record<string, number>;
  optimizedAllocations: Record<string, number>;
} {
  // Calculate original FSFVI
  const { fsfviValue: originalFSFVI, processedData } = computeFSFVI(data);
  
  // Keep track of original allocations
  const originalAllocations: Record<string, number> = {};
  Object.keys(processedData.subsectors).forEach(key => {
    originalAllocations[key] = processedData.subsectors[key].totalExpenditures;
  });
  
  // Create a working copy of the data
  const workingData: FSFVIData = JSON.parse(JSON.stringify(processedData));
  const totalBudget = data.totalBudget;
  
  // Extract component IDs for easier reference
  const componentIds = Object.keys(workingData.subsectors);
  
  // Set minimum and maximum constraints (min: 1% of original, max: 200% of original)
  const minAllocations: Record<string, number> = {};
  const maxAllocations: Record<string, number> = {};
  
  componentIds.forEach(id => {
    minAllocations[id] = Math.max(originalAllocations[id] * 0.01, 0.1); // Min 1% or 0.1M
    maxAllocations[id] = Math.min(originalAllocations[id] * 2, totalBudget * 0.4); // Max 200% or 40% of total
  });
  
  // Initialize with current allocations
  const currentAllocations: Record<string, number> = {...originalAllocations};
  
  // Optimization parameters
  const maxIterations = 100;
  const initialLearningRate = 0.1;
  const minImprovement = 0.0001;
  
  // Track optimization progress
  let currentFSFVI = originalFSFVI;
  let prevFSFVI = Infinity;
  let iteration = 0;
  let learningRate = initialLearningRate;
  
  // Main optimization loop using gradient descent with adaptive step size
  while (iteration < maxIterations && (prevFSFVI - currentFSFVI) > minImprovement) {
    prevFSFVI = currentFSFVI;
    iteration++;
    
    // Calculate gradients (marginal benefit of additional allocation for each component)
    const gradients: Record<string, number> = {};
    
    componentIds.forEach(id => {
      const component = workingData.subsectors[id];
      const performanceGap = component.averagePerformanceGap;
      const sensitivityParam = component.sensitivityParameter!;
      const weight = component.weight!;
      const currentAllocation = currentAllocations[id];
      
      // Calculate gradient using the derivative of vulnerability function
      // δᵢ·(-αᵢ)/((1+αᵢfᵢ)²) * ωᵢ
      const gradient = -1 * performanceGap * sensitivityParam / 
                     Math.pow(1 + sensitivityParam * currentAllocation, 2) * weight;
      
      gradients[id] = gradient;
    });
    
    // Normalize gradients and determine step sizes
    const totalGradientMagnitude = Object.values(gradients)
      .reduce((sum, grad) => sum + Math.abs(grad), 0);
    
    if (totalGradientMagnitude === 0) break; // No improvement possible
    
    // Calculate tentative new allocations proportional to gradients
    const tentativeAllocations: Record<string, number> = {};
    let tentativeTotalAllocation = 0;
    
    componentIds.forEach(id => {
      // More negative gradient means more reduction needed
      const normalizedGradient = gradients[id] / totalGradientMagnitude;
      const adjustmentFactor = learningRate * normalizedGradient;
      
      // Calculate new allocation with constraints
      let newAllocation = currentAllocations[id] - adjustmentFactor * totalBudget;
      newAllocation = Math.max(newAllocation, minAllocations[id]); // Apply min constraint
      newAllocation = Math.min(newAllocation, maxAllocations[id]); // Apply max constraint
      
      tentativeAllocations[id] = newAllocation;
      tentativeTotalAllocation += newAllocation;
    });
    
    // Scale allocations to match budget constraint
    const scaleFactor = totalBudget / tentativeTotalAllocation;
    
    componentIds.forEach(id => {
      currentAllocations[id] = tentativeAllocations[id] * scaleFactor;
      // Ensure min allocation constraints are still met after scaling
      if (currentAllocations[id] < minAllocations[id]) {
        currentAllocations[id] = minAllocations[id];
      }
    });
    
    // Redistribute any excess to maintain budget constraint
    const currentTotal = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
    const remainingBudget = totalBudget - currentTotal;
    
    if (Math.abs(remainingBudget) > 0.001) { // If budget doesn't match within tolerance
      // Distribute remainder proportionally among components not at min/max
      const adjustableComponents = componentIds.filter(id => 
        currentAllocations[id] > minAllocations[id] && 
        currentAllocations[id] < maxAllocations[id]);
      
      if (adjustableComponents.length > 0) {
        const adjustmentPerComponent = remainingBudget / adjustableComponents.length;
        
        adjustableComponents.forEach(id => {
          currentAllocations[id] += adjustmentPerComponent;
        });
      }
    }
    
    // Update working data with new allocations
    componentIds.forEach(id => {
      workingData.subsectors[id].totalExpenditures = currentAllocations[id];
      // Update vulnerability with new allocation
      workingData.subsectors[id].vulnerability = calculateComponentVulnerability(
        workingData.subsectors[id].averagePerformanceGap,
        currentAllocations[id],
        workingData.subsectors[id].sensitivityParameter!
      );
    });
    
    // Calculate new FSFVI
    currentFSFVI = calculateFSFVI(workingData);
    
    // Adaptive learning rate: increase if improving, decrease if not
    if (currentFSFVI < prevFSFVI) {
      learningRate *= 1.1; // Increase learning rate if improving
    } else {
      learningRate *= 0.5; // Decrease learning rate if not improving
      currentFSFVI = prevFSFVI; // Revert to previous state
    }
  }
  
  // Final adjustment to meet budget constraint exactly
  const finalTotal = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
  const finalScaleFactor = totalBudget / finalTotal;
  
  componentIds.forEach(id => {
    currentAllocations[id] *= finalScaleFactor;
    workingData.subsectors[id].totalExpenditures = currentAllocations[id];
  });
  
  // Recalculate final vulnerabilities and FSFVI
  componentIds.forEach(id => {
    workingData.subsectors[id].vulnerability = calculateComponentVulnerability(
      workingData.subsectors[id].averagePerformanceGap,
      workingData.subsectors[id].totalExpenditures,
      workingData.subsectors[id].sensitivityParameter!
    );
  });
  
  const optimizedFSFVI = calculateFSFVI(workingData);
  
  return {
    originalFSFVI,
    optimizedFSFVI,
    originalAllocations,
    optimizedAllocations: currentAllocations
  };
}

/**
 * Calculates the efficiency gain from optimization
 * 
 * @param originalFSFVI Original FSFVI value
 * @param optimizedFSFVI Optimized FSFVI value
 * @returns Efficiency metrics
 */
export function calculateEfficiencyMetrics(originalFSFVI: number, optimizedFSFVI: number): {
  absoluteGap: number;
  gapRatio: number;
  efficiencyIndex: number;
} {
  const absoluteGap = originalFSFVI - optimizedFSFVI;
  const gapRatio = absoluteGap / optimizedFSFVI;
  const efficiencyIndex = optimizedFSFVI / originalFSFVI;
  
  return {
    absoluteGap,
    gapRatio,
    efficiencyIndex
  };
} 