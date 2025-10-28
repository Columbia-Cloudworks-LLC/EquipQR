/**
 * JSON Reporter
 * 
 * Generates JSON validation reports for CI artifacts and programmatic consumption
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import type { ValidationReport } from '../models/ValidationResult.js';
import { ValidationReportSchema } from '../models/ValidationResult.js';

/**
 * Generate JSON report from validation results
 * 
 * @param report - Complete validation report
 * @returns JSON string (formatted with 2-space indentation)
 */
export function generateJsonReport(report: ValidationReport): string {
  // Validate report structure
  ValidationReportSchema.parse(report);
  
  // Serialize to JSON with formatting
  return JSON.stringify(report, null, 2);
}

/**
 * Write JSON report to file
 * 
 * @param report - Complete validation report
 * @param outputPath - Output file path
 */
export function writeJsonReport(report: ValidationReport, outputPath: string): void {
  const json = generateJsonReport(report);
  
  // Ensure directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  // Write report
  writeFileSync(outputPath, json, 'utf-8');
  
  console.log(`📁 JSON report written to: ${outputPath}`);
}

/**
 * Create report summary for quick overview
 * 
 * @param report - Complete validation report
 * @returns Summary object
 */
export function createReportSummary(report: ValidationReport) {
  return {
    timestamp: report.metrics.timestamp,
    mode: report.metrics.validationMode,
    filesValidated: report.metrics.filesValidated,
    totalIssues: report.metrics.totalIssues,
    qualityScore: report.metrics.qualityScore,
    severityBreakdown: report.metrics.issuesBySeverity,
    categoryBreakdown: report.metrics.issuesByCategory,
    trend: report.metrics.trendComparison
      ? {
          scoreDelta: report.metrics.trendComparison.scoreDelta,
          issuesDelta: report.metrics.trendComparison.issuesDelta,
        }
      : null,
  };
}

