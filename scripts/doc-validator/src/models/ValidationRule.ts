/**
 * Validation Rule Interface
 * 
 * Base interface for all validation rules
 */

import type { DocumentationFile } from './DocumentationFile.js';
import type { ValidationResult } from './ValidationResult.js';
import type { Severity, ValidationCategory } from './ValidationConfig.js';
import type { ValidationContext } from '../utils/validation-context.js';

/**
 * Base validation rule interface
 * 
 * All validation rules must implement this interface
 */
export interface ValidationRule {
  /**
   * Unique rule identifier (e.g., "quality-001-internal-links")
   */
  id: string;
  
  /**
   * Rule category
   */
  category: ValidationCategory;
  
  /**
   * Human-readable rule name
   */
  name: string;
  
  /**
   * Detailed description of what the rule checks
   */
  description: string;
  
  /**
   * Default severity level (can be overridden in configuration)
   */
  severity: Severity;
  
  /**
   * Document types this rule applies to
   * Empty array means applies to all types
   */
  appliesToTypes: string[];
  
  /**
   * Execute validation rule on a documentation file
   * 
   * @param file - Documentation file to validate
   * @param context - Validation context (config, glossary, other files, etc.)
   * @returns Array of validation results (empty if all checks pass)
   */
  validate(
    file: DocumentationFile,
    context: ValidationContext
  ): Promise<ValidationResult[]>;
}

/**
 * Helper to check if rule applies to a file
 * 
 * @param rule - Validation rule
 * @param file - Documentation file
 * @returns Whether rule should be applied to this file
 */
export function ruleAppliesTo(rule: ValidationRule, file: DocumentationFile): boolean {
  // If appliesToTypes is empty, rule applies to all types
  if (rule.appliesToTypes.length === 0) {
    return true;
  }
  
  return rule.appliesToTypes.includes(file.type);
}

