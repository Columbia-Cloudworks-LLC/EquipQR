/**
 * Markdown Parser
 * 
 * Parses markdown files into Abstract Syntax Trees (AST) using unified/remark
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';

/**
 * Parse markdown content into AST
 * 
 * @param content - Markdown content as string
 * @returns Markdown AST (Root node)
 */
export function parseMarkdown(content: string): Root {
  const processor = unified()
    .use(remarkParse)         // Parse markdown
    .use(remarkGfm)           // Support GitHub Flavored Markdown
    .use(remarkFrontmatter);  // Parse YAML frontmatter
  
  const ast = processor.parse(content);
  return ast as Root;
}

/**
 * Parse markdown file from path
 * 
 * @param filePath - Path to markdown file
 * @param content - File content
 * @returns Markdown AST
 */
export function parseMarkdownFile(filePath: string, content: string): Root {
  try {
    return parseMarkdown(content);
  } catch (error) {
    throw new Error(`Failed to parse markdown file: ${filePath}`, { cause: error });
  }
}

