/**
 * Link Validators
 * 
 * Validates internal and external links in documentation
 */

import { visit } from 'unist-util-visit';
import { existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import type { ValidationRule } from '../../models/ValidationRule.js';
import type { DocumentationFile } from '../../models/DocumentationFile.js';
import type { ValidationResult } from '../../models/ValidationResult.js';
import type { ValidationContext } from '../../utils/validation-context.js';

/**
 * Internal Link Validator
 * 
 * Rule: quality-001-internal-links
 * Checks that all internal markdown links resolve to existing files
 */
export const internalLinkValidator: ValidationRule = {
  id: 'quality-001-internal-links',
  category: 'quality',
  name: 'Internal Link Validation',
  description: 'Validates that all internal markdown links resolve to existing files',
  severity: 'critical',
  appliesToTypes: [], // Applies to all document types
  
  async validate(file: DocumentationFile, context: ValidationContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    if (!file.ast) {
      return results; // No AST available
    }
    
    // Get file's directory for resolving relative links
    const fileDir = dirname(join(context.repositoryRoot, file.path));
    
    // Visit all link nodes in the AST
    visit(file.ast, 'link', (node: any) => {
      const url = node.url as string;
      
      // Skip external links (http://, https://, mailto:, etc.)
      if (url.startsWith('http://') || 
          url.startsWith('https://') || 
          url.startsWith('mailto:') ||
          url.startsWith('#')) { // Skip anchor links
        return;
      }
      
      // Remove anchor from URL
      const urlWithoutAnchor = url.split('#')[0];
      
      if (!urlWithoutAnchor) {
        return; // Only an anchor link
      }
      
      // Resolve relative path
      const targetPath = resolve(fileDir, urlWithoutAnchor);
      
      // Check if target file exists
      if (!existsSync(targetPath)) {
        results.push({
          ruleId: 'quality-001-internal-links',
          filePath: file.path,
          line: node.position?.start.line,
          column: node.position?.start.column,
          severity: 'critical',
          status: 'fail',
          message: `Broken internal link to '${urlWithoutAnchor}' - target file does not exist`,
          suggestedFix: `Check if the file exists and update the link path, or remove the link if no longer needed`,
          context: `[${node.children?.[0]?.value || 'link'}](${url})`,
        });
      }
    });
    
    return results;
  },
};

/**
 * External Link Validator
 * 
 * Rule: quality-004-external-links
 * Validates external links are reachable (with rate limiting)
 */
export const externalLinkValidator: ValidationRule = {
  id: 'quality-004-external-links',
  category: 'quality',
  name: 'External Link Validation',
  description: 'Validates that external links are reachable',
  severity: 'medium',
  appliesToTypes: [],
  
  async validate(file: DocumentationFile, context: ValidationContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    if (!file.ast) {
      return results;
    }
    
    // Collect all external links
    const externalLinks: Array<{ url: string; node: any }> = [];
    
    visit(file.ast, 'link', (node: any) => {
      const url = node.url as string;
      
      if (url.startsWith('http://') || url.startsWith('https://')) {
        externalLinks.push({ url, node });
      }
    });
    
    // Check each external link
    for (const { url, node } of externalLinks) {
      // Check if URL is exempted
      const domain = new URL(url).hostname;
      const isExempted = context.exemptions.exemptedDomains.includes(domain) ||
                         context.exemptions.exemptedUrls.some(pattern => {
                           if (pattern.endsWith('*')) {
                             return url.startsWith(pattern.slice(0, -1));
                           }
                           return url === pattern;
                         });
      
      if (isExempted) {
        continue; // Skip exempted links
      }
      
      // Check cache first
      const cached = context.externalLinkCache.get(url);
      if (cached) {
        // Check if cache is still valid
        const cacheAge = cached.lastValidated 
          ? (Date.now() - cached.lastValidated.getTime()) / (1000 * 60 * 60)
          : Infinity;
        
        if (cacheAge < context.config.externalLinkCacheDuration) {
          if (cached.status === 'broken') {
            results.push({
              ruleId: 'quality-004-external-links',
              filePath: file.path,
              line: node.position?.start.line,
              column: node.position?.start.column,
              severity: 'medium',
              status: 'fail',
              message: `External link appears to be broken: ${url} (status: ${cached.statusCode || 'unknown'})`,
              suggestedFix: 'Verify the URL is correct and the resource is still available',
              context: `[${node.children?.[0]?.value || 'link'}](${url})`,
            });
          }
          continue; // Use cached result
        }
      }
      
      // Note: Actual HTTP checking would happen here
      // For now, we just mark as unchecked and cache it
      context.externalLinkCache.set(url, {
        url,
        domain,
        sourceFile: file.path,
        lastValidated: null,
        status: 'unchecked',
        exempted: false,
      });
    }
    
    return results;
  },
};

