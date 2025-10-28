/**
 * Validation Runner
 * 
 * Executes validation rules, collects results, handles errors
 */

import type { ValidationRule } from '../models/ValidationRule.js';
import type { DocumentationFile } from '../models/DocumentationFile.js';
import type { ValidationResult } from '../models/ValidationResult.js';
import type { ValidationContext } from './validation-context.js';
import { isRuleEnabled } from './config.js';
import { getEffectiveSeverity } from './severity.js';

/**
 * Validation run statistics
 */
export interface ValidationStats {
  totalRules: number;
  rulesExecuted: number;
  rulesSkipped: number;
  filesValidated: number;
  totalResults: number;
  errors: string[];
}

/**
 * Execute a single validation rule on a file
 * 
 * @param rule - Validation rule to execute
 * @param file - Documentation file to validate
 * @param context - Validation context
 * @returns Array of validation results
 */
async function executeRule(
  rule: ValidationRule,
  file: DocumentationFile,
  context: ValidationContext
): Promise<ValidationResult[]> {
  try {
    const results = await rule.validate(file, context);
    
    // Apply effective severity from configuration
    return results.map(result => ({
      ...result,
      severity: getEffectiveSeverity(rule.id, rule.severity, context.config),
    }));
  } catch (error) {
    console.error(`Error executing rule ${rule.id} on file ${file.path}:`, error);
    
    // Return an error result instead of throwing
    return [{
      ruleId: rule.id,
      filePath: file.path,
      severity: 'high',
      status: 'fail',
      message: `Internal validation error: ${error instanceof Error ? error.message : String(error)}`,
      suggestedFix: 'This is a validator bug. Please report it.',
    }];
  }
}

/**
 * Run validation rules on a single file
 * 
 * @param file - Documentation file to validate
 * @param rules - Array of validation rules
 * @param context - Validation context
 * @returns Array of validation results
 */
export async function validateFile(
  file: DocumentationFile,
  rules: ValidationRule[],
  context: ValidationContext
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  for (const rule of rules) {
    // Check if rule is enabled
    if (!isRuleEnabled(context.config, rule.id)) {
      continue;
    }
    
    // Check if rule applies to this file type
    // Import the helper function inline to avoid circular dependency
    const applies = rule.appliesToTypes.length === 0 || 
                   rule.appliesToTypes.includes(file.type);
    
    if (!applies) {
      continue;
    }
    
    // Execute rule
    const ruleResults = await executeRule(rule, file, context);
    results.push(...ruleResults);
  }
  
  return results;
}

/**
 * Run validation rules on multiple files
 * 
 * @param files - Documentation files to validate
 * @param rules - Array of validation rules
 * @param context - Validation context
 * @returns Object containing all results and statistics
 */
export async function validateFiles(
  files: DocumentationFile[],
  rules: ValidationRule[],
  context: ValidationContext
): Promise<{
  results: ValidationResult[];
  stats: ValidationStats;
}> {
  const allResults: ValidationResult[] = [];
  const errors: string[] = [];
  
  let rulesExecuted = 0;
  let rulesSkipped = 0;
  
  // Validate each file
  for (const file of files) {
    try {
      const fileResults = await validateFile(file, rules, context);
      allResults.push(...fileResults);
      
      // Count rules executed for this file
      for (const rule of rules) {
        if (isRuleEnabled(context.config, rule.id)) {
          const applies = rule.appliesToTypes.length === 0 || 
                         rule.appliesToTypes.includes(file.type);
          if (applies) {
            rulesExecuted++;
          } else {
            rulesSkipped++;
          }
        } else {
          rulesSkipped++;
        }
      }
    } catch (error) {
      const errorMsg = `Error validating file ${file.path}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }
  
  const stats: ValidationStats = {
    totalRules: rules.length,
    rulesExecuted,
    rulesSkipped,
    filesValidated: files.length,
    totalResults: allResults.length,
    errors,
  };
  
  return { results: allResults, stats };
}

