/**
 * Validation Configuration Schema
 * 
 * Defines the structure for .doc-validator/config.json
 * Controls which validation rules are enabled and their severity levels
 */

import { z } from 'zod';

/**
 * Severity levels for validation results
 */
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Validation categories
 */
export const ValidationCategorySchema = z.enum([
  'quality',
  'sync',
  'structure',
  'accessibility'
]);
export type ValidationCategory = z.infer<typeof ValidationCategorySchema>;

/**
 * Configuration for a single validation rule
 */
export const RuleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  severity: SeveritySchema.optional(), // Override default severity
});
export type RuleConfig = z.infer<typeof RuleConfigSchema>;

/**
 * Rate limiting configuration
 */
export const RateLimitConfigSchema = z.object({
  defaultDelayMs: z.number().min(100).default(1000), // Default 1 second between requests
  perDomain: z.record(z.string(), z.number().min(0)).optional(), // Custom delays per domain
});
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

/**
 * Complete validation configuration
 */
export const ValidationConfigSchema = z.object({
  // Rule configuration: rule ID → configuration
  rules: z.record(z.string(), RuleConfigSchema).default({}),
  
  // Validation mode
  incremental: z.boolean().default(false),
  
  // External link validation settings
  externalLinkCacheDuration: z.number().min(0).default(24), // Hours
  
  // Rate limiting for external links
  rateLimits: RateLimitConfigSchema.default({
    defaultDelayMs: 1000,
    perDomain: {},
  }),
  
  // Paths to exclude from validation
  excludePaths: z.array(z.string()).default([
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '.git/**',
  ]),
  
  // Documentation root directory
  docsRoot: z.string().default('docs'),
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

/**
 * Example configuration file:
 * 
 * {
 *   "rules": {
 *     "quality-001-internal-links": {
 *       "enabled": true,
 *       "severity": "critical"
 *     },
 *     "quality-004-external-links": {
 *       "enabled": true,
 *       "severity": "medium"
 *     },
 *     "structure-002-duplicate-content": {
 *       "enabled": false
 *     }
 *   },
 *   "incremental": false,
 *   "externalLinkCacheDuration": 24,
 *   "rateLimits": {
 *     "defaultDelayMs": 1000,
 *     "perDomain": {
 *       "github.com": 2000,
 *       "supabase.com": 1500
 *     }
 *   },
 *   "excludePaths": [
 *     "node_modules/**",
 *     "dist/**",
 *     "coverage/**"
 *   ],
 *   "docsRoot": "docs"
 * }
 */

