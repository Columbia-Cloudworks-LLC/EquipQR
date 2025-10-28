/**
 * Configuration Loader
 * 
 * Loads and validates .doc-validator/config.json
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ValidationConfigSchema, type ValidationConfig } from '../models/ValidationConfig.js';

/**
 * Load validation configuration from .doc-validator/config.json
 * Falls back to default configuration if file doesn't exist
 * 
 * @param repositoryRoot - Absolute path to repository root
 * @returns Validated configuration object
 */
export function loadConfig(repositoryRoot: string): ValidationConfig {
  const configPath = join(repositoryRoot, '.doc-validator', 'config.json');
  
  // Return default configuration if file doesn't exist
  if (!existsSync(configPath)) {
    console.warn(`Configuration file not found: ${configPath}`);
    console.warn('Using default configuration');
    return ValidationConfigSchema.parse({});
  }
  
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(configContent);
    
    // Validate and transform using Zod schema
    const config = ValidationConfigSchema.parse(rawConfig);
    
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${configPath}`, { cause: error });
    }
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      throw new Error(
        `Configuration validation failed: ${configPath}\n${JSON.stringify((error as any).issues, null, 2)}`,
        { cause: error }
      );
    }
    
    throw error;
  }
}

/**
 * Get configuration for a specific rule
 * Returns undefined if rule is not configured
 * 
 * @param config - Validation configuration
 * @param ruleId - Rule identifier (e.g., "quality-001-internal-links")
 * @returns Rule configuration or undefined
 */
export function getRuleConfig(config: ValidationConfig, ruleId: string) {
  return config.rules[ruleId];
}

/**
 * Check if a rule is enabled
 * Returns true if rule is not configured (default behavior)
 * 
 * @param config - Validation configuration
 * @param ruleId - Rule identifier
 * @returns Whether the rule is enabled
 */
export function isRuleEnabled(config: ValidationConfig, ruleId: string): boolean {
  const ruleConfig = getRuleConfig(config, ruleId);
  return ruleConfig?.enabled !== false; // Default to enabled if not configured
}

