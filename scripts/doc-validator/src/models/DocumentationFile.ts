/**
 * Documentation File Schema
 * 
 * Defines the structure for documentation file metadata and frontmatter
 */

import { z } from 'zod';

/**
 * Documentation type classification
 */
export const DocumentationTypeSchema = z.enum([
  'guide',        // How-to guides and tutorials
  'reference',    // API references, command references
  'architecture', // System design documents
  'feature',      // Feature specifications
  'deployment',   // Deployment and operations guides
  'other',        // Miscellaneous documentation
]);

export type DocumentationType = z.infer<typeof DocumentationTypeSchema>;

/**
 * Documentation status from frontmatter
 */
export const DocumentationStatusSchema = z.enum([
  'draft',       // Work in progress, exempt from completeness checks
  'wip',         // Alternative work-in-progress marker
  'complete',    // Full validation applies
  'deprecated',  // Marked for archival
]);

export type DocumentationStatus = z.infer<typeof DocumentationStatusSchema>;

/**
 * YAML frontmatter schema
 * 
 * Used to validate frontmatter in markdown files
 */
export const FrontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: DocumentationStatusSchema.optional(),
  wip: z.boolean().optional(), // Alternative to status: draft
  type: DocumentationTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
}).passthrough(); // Allow additional fields

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/**
 * Documentation file metadata
 */
export const DocumentationFileSchema = z.object({
  path: z.string(), // Relative path from repository root
  type: DocumentationTypeSchema,
  status: DocumentationStatusSchema,
  lastModified: z.date(),
  frontmatter: FrontmatterSchema,
  content: z.string(),
  ast: z.any().optional(), // MarkdownAST (not validated by Zod)
}).transform((data) => ({
  ...data,
  // Derived properties
  isWorkInProgress: data.status === 'draft' || data.status === 'wip' || data.frontmatter.wip === true,
  requiresFullValidation: !(data.status === 'draft' || data.status === 'wip' || data.frontmatter.wip === true),
}));

export type DocumentationFile = z.infer<typeof DocumentationFileSchema>;

