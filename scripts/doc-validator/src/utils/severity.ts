/**
 * Severity Assignment Logic
 * 
 * Maps rule IDs to severity levels, with configuration overrides
 */

import type { Severity } from '../models/ValidationConfig.js';
import type { ValidationConfig } from '../models/ValidationConfig.js';
import { getRuleConfig } from './config.js';

/**
 * Get effective severity for a rule
 * 
 * Applies configuration overrides if present, otherwise uses default severity
 * 
 * @param ruleId - Rule identifier
 * @param defaultSeverity - Default severity from rule definition
 * @param config - Validation configuration
 * @returns Effective severity level
 */
export function getEffectiveSeverity(
  ruleId: string,
  defaultSeverity: Severity,
  config: ValidationConfig
): Severity {
  const ruleConfig = getRuleConfig(config, ruleId);
  
  // Return override if configured
  if (ruleConfig?.severity) {
    return ruleConfig.severity;
  }
  
  // Otherwise return default
  return defaultSeverity;
}

/**
 * Severity ordering for comparison and sorting
 */
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Compare two severity levels
 * 
 * @param a - First severity
 * @param b - Second severity
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

/**
 * Check if severity level meets minimum threshold
 * 
 * @param severity - Severity to check
 * @param minSeverity - Minimum severity threshold
 * @returns Whether severity meets minimum
 */
export function meetsMinimumSeverity(severity: Severity, minSeverity: Severity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[minSeverity];
}

/**
 * Get icon for severity level
 * 
 * @param severity - Severity level
 * @returns Emoji icon
 */
export function getSeverityIcon(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
    default:
      return '⚪';
  }
}

/**
 * Get human-readable label for severity
 * 
 * @param severity - Severity level
 * @returns Uppercase label
 */
export function getSeverityLabel(severity: Severity): string {
  return severity.toUpperCase();
}

