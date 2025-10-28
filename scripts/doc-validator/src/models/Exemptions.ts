/**
 * Link Exemptions Schema
 * 
 * Defines the structure for .doc-validator/exemptions.json
 * Specifies URLs and domains to skip during external link validation
 */

import { z } from 'zod';

/**
 * Link exemptions configuration
 */
export const ExemptionsConfigSchema = z.object({
  // Specific URLs to exempt (supports wildcards via glob patterns)
  exemptedUrls: z.array(z.string()).default([]),
  
  // Domains to exempt entirely
  exemptedDomains: z.array(z.string()).default([
    'localhost',
    '127.0.0.1',
  ]),
  
  // Reasons for exemptions (documentation only, not validated)
  exemptionReasons: z.record(z.string(), z.string()).optional(),
});

export type ExemptionsConfig = z.infer<typeof ExemptionsConfigSchema>;

