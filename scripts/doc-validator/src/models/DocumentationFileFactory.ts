/**
 * Documentation File Factory
 * 
 * Combines parsed markdown, frontmatter, and metadata into DocumentationFile objects
 */

import { statSync } from 'fs';
import { parseMarkdownFile } from '../parsers/markdown.js';
import { extractFrontmatter } from '../parsers/frontmatter.js';
import { 
  DocumentationFileSchema, 
  type DocumentationFile,
  type DocumentationType,
  type DocumentationStatus
} from './DocumentationFile.js';

/**
 * Infer document type from file path or frontmatter
 * 
 * @param path - Relative file path
 * @param frontmatterType - Type from frontmatter (if provided)
 * @returns Inferred document type
 */
function inferDocumentType(
  path: string,
  frontmatterType?: string
): DocumentationType {
  // Use frontmatter type if provided
  if (frontmatterType) {
    return frontmatterType as DocumentationType;
  }
  
  // Infer from path
  const normalizedPath = path.toLowerCase();
  
  if (normalizedPath.includes('architecture')) return 'architecture';
  if (normalizedPath.includes('feature')) return 'feature';
  if (normalizedPath.includes('deployment')) return 'deployment';
  if (normalizedPath.includes('guide') || normalizedPath.includes('how-to')) return 'guide';
  if (normalizedPath.includes('reference') || normalizedPath.includes('api')) return 'reference';
  
  return 'other';
}

/**
 * Get file last modified timestamp
 * 
 * @param absolutePath - Absolute file path
 * @returns Last modified date
 */
function getLastModified(absolutePath: string): Date {
  const stats = statSync(absolutePath);
  return stats.mtime;
}

/**
 * Create DocumentationFile from file path and content
 * 
 * @param absolutePath - Absolute file path
 * @param relativePath - Relative path from repository root
 * @param content - File content
 * @returns Validated DocumentationFile object
 */
export function createDocumentationFile(
  absolutePath: string,
  relativePath: string,
  content: string
): DocumentationFile {
  // Parse markdown and frontmatter
  const ast = parseMarkdownFile(absolutePath, content);
  const frontmatter = extractFrontmatter(ast);
  
  // Infer document type
  const type = inferDocumentType(relativePath, frontmatter.type);
  
  // Determine status
  const status: DocumentationStatus = frontmatter.status || 'complete';
  
  // Get last modified timestamp
  const lastModified = getLastModified(absolutePath);
  
  // Create and validate DocumentationFile
  const documentationFile = DocumentationFileSchema.parse({
    path: relativePath,
    type,
    status,
    lastModified,
    frontmatter,
    content,
    ast, // Optional, but included for validators that need it
  });
  
  return documentationFile;
}

/**
 * Check if a DocumentationFile should be exempted from validation
 * 
 * @param file - DocumentationFile
 * @returns Exemption reason if exempted, null otherwise
 */
export function getExemptionReason(file: DocumentationFile): string | null {
  if (file.isWorkInProgress) {
    if (file.status === 'draft' || file.status === 'wip') {
      return `WIP: status marked as '${file.status}'`;
    }
    if (file.frontmatter.wip === true) {
      return 'WIP: frontmatter has wip: true';
    }
  }
  
  if (file.status === 'deprecated') {
    return 'Deprecated: marked for archival';
  }
  
  return null;
}

