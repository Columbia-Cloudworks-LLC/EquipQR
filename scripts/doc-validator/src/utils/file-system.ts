/**
 * File System Utilities
 * 
 * Utilities for reading documentation files and filtering by patterns
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import type { ValidationConfig } from '../models/ValidationConfig.js';

/**
 * Recursively find all markdown files in a directory
 * 
 * @param directory - Absolute path to search directory
 * @param excludePatterns - Glob patterns to exclude (e.g., node_modules/**)
 * @returns Array of absolute file paths
 */
export function findMarkdownFiles(
  directory: string,
  excludePatterns: string[] = []
): string[] {
  const files: string[] = [];
  
  if (!existsSync(directory)) {
    return files;
  }
  
  const entries = readdirSync(directory);
  
  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    
    // Skip if matches exclude pattern
    if (shouldExclude(fullPath, excludePatterns)) {
      continue;
    }
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      files.push(...findMarkdownFiles(fullPath, excludePatterns));
    } else if (stat.isFile() && entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Check if a path should be excluded based on patterns
 * 
 * @param path - Path to check
 * @param patterns - Exclude patterns (simple glob support: ** and *)
 * @returns Whether the path should be excluded
 */
export function shouldExclude(path: string, patterns: string[]): boolean {
  const normalizedPath = path.replace(/\\/g, '/');
  
  for (const pattern of patterns) {
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    // Simple glob matching
    if (normalizedPattern.includes('**')) {
      // Match any number of directories
      const regex = new RegExp(
        normalizedPattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
      );
      if (regex.test(normalizedPath)) {
        return true;
      }
    } else if (normalizedPattern.includes('*')) {
      // Match single directory level
      const regex = new RegExp(
        normalizedPattern.replace(/\*/g, '[^/]*')
      );
      if (regex.test(normalizedPath)) {
        return true;
      }
    } else {
      // Exact match
      if (normalizedPath.includes(normalizedPattern)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Read file content as UTF-8 string
 * 
 * @param filePath - Absolute path to file
 * @returns File content
 */
export function readFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

/**
 * Get relative path from repository root
 * 
 * @param filePath - Absolute file path
 * @param repositoryRoot - Absolute path to repository root
 * @returns Relative path (POSIX style with forward slashes)
 */
export function getRelativePath(filePath: string, repositoryRoot: string): string {
  const relativePath = relative(repositoryRoot, filePath);
  // Normalize to POSIX style (forward slashes)
  return relativePath.replace(/\\/g, '/');
}

/**
 * Discover all documentation files in repository
 * 
 * @param repositoryRoot - Absolute path to repository root
 * @param config - Validation configuration
 * @returns Array of absolute file paths
 */
export function discoverDocumentationFiles(
  repositoryRoot: string,
  config: ValidationConfig
): string[] {
  const docsRoot = join(repositoryRoot, config.docsRoot);
  return findMarkdownFiles(docsRoot, config.excludePaths);
}

