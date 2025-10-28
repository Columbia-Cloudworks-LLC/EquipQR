/**
 * Metrics Calculator
 * 
 * Calculates quality scores, category breakdowns, and trend comparisons
 */

import type { ValidationResult, MetricsReport, TrendData } from '../models/ValidationResult.js';
import type { Severity, ValidationCategory } from '../models/ValidationConfig.js';

/**
 * Calculate quality score from validation results
 * 
 * Score = (passed checks / total applicable checks) * 100
 * 
 * @param totalChecks - Total number of validation checks performed
 * @param failedChecks - Number of failed checks
 * @returns Quality score (0-100)
 */
export function calculateQualityScore(totalChecks: number, failedChecks: number): number {
  if (totalChecks === 0) {
    return 100; // No checks = perfect score
  }
  
  const passedChecks = totalChecks - failedChecks;
  return (passedChecks / totalChecks) * 100;
}

/**
 * Count issues by severity
 */
export function countBySeverity(results: ValidationResult[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  for (const result of results) {
    if (result.status === 'fail') {
      counts[result.severity]++;
    }
  }
  
  return counts;
}

/**
 * Count issues by category
 */
export function countByCategory(results: ValidationResult[]): Record<ValidationCategory, number> {
  const counts: Record<ValidationCategory, number> = {
    quality: 0,
    sync: 0,
    structure: 0,
    accessibility: 0,
  };
  
  for (const result of results) {
    if (result.status === 'fail') {
      // Extract category from rule ID (e.g., "quality-001" → "quality")
      const category = result.ruleId.split('-')[0] as ValidationCategory;
      if (category in counts) {
        counts[category]++;
      }
    }
  }
  
  return counts;
}

/**
 * Calculate category scores
 * 
 * @param results - All validation results
 * @param totalChecksPerCategory - Total checks performed per category
 * @returns Category scores (0-100)
 */
export function calculateCategoryScores(
  results: ValidationResult[],
  totalChecksPerCategory: Record<ValidationCategory, number>
): Record<ValidationCategory, number> {
  const failedByCategory = countByCategory(results);
  
  const scores: Record<ValidationCategory, number> = {
    quality: 0,
    sync: 0,
    structure: 0,
    accessibility: 0,
  };
  
  for (const category of Object.keys(scores) as ValidationCategory[]) {
    const total = totalChecksPerCategory[category] || 0;
    const failed = failedByCategory[category];
    scores[category] = calculateQualityScore(total, failed);
  }
  
  return scores;
}

/**
 * Generate metrics report from validation results
 * 
 * @param results - Validation results
 * @param filesValidated - Number of files validated
 * @param validationMode - Incremental or full validation
 * @param totalChecks - Total number of checks performed
 * @param totalChecksPerCategory - Checks per category
 * @param previousReport - Previous metrics report for trend comparison
 * @returns Complete metrics report
 */
export function generateMetricsReport(
  results: ValidationResult[],
  filesValidated: number,
  validationMode: 'incremental' | 'full',
  totalChecks: number,
  totalChecksPerCategory: Record<ValidationCategory, number>,
  previousReport?: MetricsReport
): MetricsReport {
  const failedResults = results.filter(r => r.status === 'fail');
  const totalIssues = failedResults.length;
  
  const issuesBySeverity = countBySeverity(results);
  const issuesByCategory = countByCategory(results);
  
  const qualityScore = calculateQualityScore(totalChecks, totalIssues);
  const categoryScores = calculateCategoryScores(results, totalChecksPerCategory);
  
  // Calculate trend comparison
  let trendComparison: TrendData | undefined;
  if (previousReport) {
    trendComparison = {
      previousScore: previousReport.qualityScore,
      scoreDelta: qualityScore - previousReport.qualityScore,
      previousTimestamp: previousReport.timestamp,
      issuesDelta: totalIssues - previousReport.totalIssues,
    };
  }
  
  return {
    timestamp: new Date().toISOString(),
    validationMode,
    filesValidated,
    totalIssues,
    issuesBySeverity,
    issuesByCategory,
    qualityScore,
    categoryScores,
    trendComparison,
  };
}

