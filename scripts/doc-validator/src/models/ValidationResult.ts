/**
 * Validation Result Schema
 * 
 * Defines the structure for validation results and reports
 * Used for JSON output, CI artifacts, and PR comments
 */

import { z } from 'zod';
import { SeveritySchema } from './ValidationConfig.js';

/**
 * Single validation result
 */
export const ValidationResultSchema = z.object({
  ruleId: z.string(), // e.g., "quality-001-internal-links"
  filePath: z.string(), // Relative path from repository root
  line: z.number().optional(), // Line number where issue occurs
  column: z.number().optional(), // Column number where issue occurs
  severity: SeveritySchema,
  status: z.enum(['pass', 'fail']),
  message: z.string(), // Human-readable description
  suggestedFix: z.string().optional(), // Actionable fix guidance
  context: z.string().optional(), // Surrounding content for clarity
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Trend comparison data
 */
export const TrendDataSchema = z.object({
  previousScore: z.number().min(0).max(100),
  scoreDelta: z.number(), // Positive = improvement
  previousTimestamp: z.string().datetime(),
  issuesDelta: z.number(), // Negative = improvement
});

export type TrendData = z.infer<typeof TrendDataSchema>;

/**
 * Aggregated metrics report
 */
export const MetricsReportSchema = z.object({
  timestamp: z.string().datetime(),
  validationMode: z.enum(['incremental', 'full']),
  filesValidated: z.number().min(0),
  totalIssues: z.number().min(0),
  
  // Breakdown by severity
  issuesBySeverity: z.object({
    critical: z.number().min(0).default(0),
    high: z.number().min(0).default(0),
    medium: z.number().min(0).default(0),
    low: z.number().min(0).default(0),
  }),
  
  // Breakdown by category
  issuesByCategory: z.object({
    quality: z.number().min(0).default(0),
    sync: z.number().min(0).default(0),
    structure: z.number().min(0).default(0),
    accessibility: z.number().min(0).default(0),
  }),
  
  // Quality scores (0-100)
  qualityScore: z.number().min(0).max(100),
  categoryScores: z.object({
    quality: z.number().min(0).max(100),
    sync: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
  }),
  
  // Trend comparison (optional)
  trendComparison: TrendDataSchema.optional(),
});

export type MetricsReport = z.infer<typeof MetricsReportSchema>;

/**
 * Complete validation report including all results
 */
export const ValidationReportSchema = z.object({
  metrics: MetricsReportSchema,
  results: z.array(ValidationResultSchema),
  
  // Files validated in this run
  validatedFiles: z.array(z.string()),
  
  // Exempted files (WIP documentation)
  exemptedFiles: z.array(z.object({
    path: z.string(),
    reason: z.string(), // e.g., "WIP: status marked as draft"
  })),
  
  // External links checked
  externalLinks: z.array(z.object({
    url: z.string(),
    status: z.enum(['active', 'broken', 'deprecated', 'exempted', 'unchecked']),
    statusCode: z.number().optional(),
    sourceFile: z.string(),
  })).optional(),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

