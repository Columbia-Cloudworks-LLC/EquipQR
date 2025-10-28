/**
 * Frontmatter Parser
 * 
 * Extracts and validates YAML frontmatter from markdown files
 */

import { parse as parseYaml } from 'yaml';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { FrontmatterSchema, type Frontmatter } from '../models/DocumentationFile.js';

/**
 * Extract YAML frontmatter from markdown AST
 * 
 * @param ast - Markdown AST
 * @returns Parsed frontmatter object or empty object if no frontmatter
 */
export function extractFrontmatter(ast: Root): Frontmatter {
  let frontmatterContent = '';
  
  // Visit YAML frontmatter nodes
  visit(ast, 'yaml', (node: any) => {
    frontmatterContent = node.value;
  });
  
  if (!frontmatterContent) {
    return {}; // No frontmatter found
  }
  
  try {
    const rawFrontmatter = parseYaml(frontmatterContent);
    
    // Validate using Zod schema
    const frontmatter = FrontmatterSchema.parse(rawFrontmatter || {});
    
    return frontmatter;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      console.warn('Invalid frontmatter structure:', (error as any).issues);
      return {}; // Return empty frontmatter on validation error
    }
    
    // YAML parsing error
    console.warn('Failed to parse frontmatter YAML:', error);
    return {};
  }
}

/**
 * Check if frontmatter indicates work-in-progress status
 * 
 * @param frontmatter - Parsed frontmatter
 * @returns Whether document is WIP
 */
export function isWorkInProgress(frontmatter: Frontmatter): boolean {
  return (
    frontmatter.status === 'draft' ||
    frontmatter.status === 'wip' ||
    frontmatter.wip === true
  );
}

