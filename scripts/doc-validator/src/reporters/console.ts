/**
 * Console Reporter
 * 
 * Formats validation results for terminal output with colors and icons
 */

import chalk from 'chalk';
import type { ValidationReport } from '../models/ValidationResult.js';
import type { ValidationResult } from '../models/ValidationResult.js';
import type { Severity } from '../models/ValidationConfig.js';
import { getSeverityIcon } from '../utils/severity.js';

/**
 * Get chalk color function for severity
 */
function getSeverityColor(severity: Severity): typeof chalk {
  switch (severity) {
    case 'critical':
      return chalk.red.bold;
    case 'high':
      return chalk.yellow;
    case 'medium':
      return chalk.blue;
    case 'low':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

/**
 * Format a single validation result for console output
 */
function formatResult(result: ValidationResult): string {
  const icon = getSeverityIcon(result.severity);
  const colorFn = getSeverityColor(result.severity);
  const severity = result.severity.toUpperCase();
  
  let output = `\n${icon} ${colorFn(severity)}: ${result.ruleId}`;
  output += `\n  File: ${chalk.cyan(result.filePath)}`;
  
  if (result.line !== undefined) {
    output += `\n  Line: ${result.line}`;
  }
  
  output += `\n  Message: ${result.message}`;
  
  if (result.suggestedFix) {
    output += `\n  ${chalk.green('Fix:')} ${result.suggestedFix}`;
  }
  
  if (result.context) {
    output += `\n  Context: ${chalk.dim(result.context)}`;
  }
  
  return output;
}

/**
 * Format validation report for console display
 */
export function formatConsoleReport(report: ValidationReport): string {
  const { metrics, results } = report;
  
  let output = '';
  
  // Header
  output += chalk.bold.cyan('\n📋 Documentation Validation Report\n');
  output += chalk.gray('━'.repeat(60)) + '\n\n';
  
  // Summary statistics
  output += `✅ Files Validated: ${chalk.bold(String(metrics.filesValidated))}\n`;
  
  if (metrics.totalIssues === 0) {
    output += chalk.green('🎉 No issues found!\n\n');
  } else {
    output += `⚠️  Total Issues: ${chalk.bold.yellow(String(metrics.totalIssues))}\n\n`;
    
    // Issues by severity
    output += chalk.bold('Issues by Severity:\n');
    output += `  🔴 Critical: ${metrics.issuesBySeverity.critical}\n`;
    output += `  🟠 High: ${metrics.issuesBySeverity.high}\n`;
    output += `  🟡 Medium: ${metrics.issuesBySeverity.medium}\n`;
    output += `  🔵 Low: ${metrics.issuesBySeverity.low}\n\n`;
  }
  
  // Quality score
  const scoreColor = metrics.qualityScore >= 90 ? chalk.green : 
                     metrics.qualityScore >= 70 ? chalk.yellow : 
                     chalk.red;
  
  output += `Quality Score: ${scoreColor.bold(metrics.qualityScore.toFixed(1) + '%')}`;
  
  // Trend comparison
  if (metrics.trendComparison) {
    const { scoreDelta } = metrics.trendComparison;
    const scoreTrend = scoreDelta > 0 ? chalk.green(`⬆️ +${scoreDelta.toFixed(1)}%`) :
                       scoreDelta < 0 ? chalk.red(`⬇️ ${scoreDelta.toFixed(1)}%`) :
                       chalk.gray('→ No change');
    output += ` ${scoreTrend} from previous run`;
  }
  
  output += '\n\n';
  
  // Detailed results (limit to first 20 for console)
  if (results.length > 0) {
    output += chalk.bold('Validation Issues:\n');
    output += chalk.gray('─'.repeat(60)) + '\n';
    
    // Sort by severity (critical first)
    const sortedResults = [...results].sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    // Show first 20 issues
    const displayResults = sortedResults.slice(0, 20);
    displayResults.forEach(result => {
      output += formatResult(result);
    });
    
    if (results.length > 20) {
      output += `\n\n${chalk.yellow(`... and ${results.length - 20} more issues`)}\n`;
      output += chalk.gray('See full JSON report for complete details\n');
    }
  }
  
  // Exempted files
  if (report.exemptedFiles.length > 0) {
    output += '\n' + chalk.gray('─'.repeat(60)) + '\n';
    output += chalk.bold('Exempted Files:\n');
    report.exemptedFiles.forEach(exempted => {
      output += `  ${chalk.dim(exempted.path)} - ${chalk.italic(exempted.reason)}\n`;
    });
  }
  
  output += '\n' + chalk.gray('━'.repeat(60)) + '\n';
  
  return output;
}

/**
 * Print validation report to console
 */
export function printConsoleReport(report: ValidationReport): void {
  const formatted = formatConsoleReport(report);
  console.log(formatted);
}

