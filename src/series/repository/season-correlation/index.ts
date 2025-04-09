/**
 * Main exports for the season correlation system
 */

// Export all types
export * from './types/index.ts';

// Export detectors
export { PatternDetector } from './pattern-detector.ts';
export { SpecialsDetector } from './specials-detector.ts';

// Export main mapper
export { SeasonCorrelationMapper } from './mapper.ts';
