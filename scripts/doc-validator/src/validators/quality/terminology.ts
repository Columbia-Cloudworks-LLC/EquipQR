/**
 * Terminology Consistency Validator
 * 
 * Validates terminology against canonical glossary
 */

import type { ValidationRule } from '../../models/ValidationRule.js';
import type { DocumentationFile } from '../../models/DocumentationFile.js';
import type { ValidationResult } from '../../models/ValidationResult.js';
import type { ValidationContext } from '../../utils/validation-context.js';
import type { GlossaryTerm } from '../../models/Glossary.js';

/**
 * Find deprecated terms in content
 */
function findDeprecatedTerms(
  content: string,
  glossaryTerms: GlossaryTerm[]
): Array<{ term: string; canonical: string; line?: number; context?: string }> {
  const findings: Array<{ term: string; canonical: string; line?: number; context?: string }> = [];
  const lines = content.split('\n');
  
  // Build map of deprecated terms → canonical terms
  const deprecatedMap = new Map<string, string>();
  for (const glossaryTerm of glossaryTerms) {
    for (const deprecated of glossaryTerm.deprecatedTerms) {
      deprecatedMap.set(deprecated.toLowerCase(), glossaryTerm.term);
    }
  }
  
  // Search for deprecated terms
  for (const [deprecated, canonical] of deprecatedMap.entries()) {
    const regex = new RegExp(`\\b${deprecated}\\b`, 'gi');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.match(regex);
      
      if (matches && matches.length > 0) {
        // Extract context (surrounding words)
        const firstMatchIndex = line.toLowerCase().indexOf(deprecated);
        const start = Math.max(0, firstMatchIndex - 20);
        const end = Math.min(line.length, firstMatchIndex + deprecated.length + 20);
        const context = '...' + line.substring(start, end) + '...';
        
        findings.push({
          term: matches[0],
          canonical,
          line: i + 1,
          context,
        });
      }
    }
  }
  
  return findings;
}

/**
 * Terminology Consistency Validator
 * 
 * Rule: quality-005-terminology
 * Checks terms against canonical glossary
 */
export const terminologyConsistencyValidator: ValidationRule = {
  id: 'quality-005-terminology',
  category: 'quality',
  name: 'Terminology Consistency',
  description: 'Validates that documentation uses canonical terminology from the glossary',
  severity: 'medium',
  appliesToTypes: [], // Applies to all types
  
  async validate(file: DocumentationFile, context: ValidationContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Skip if no glossary terms
    if (context.glossaryTerms.length === 0) {
      return results;
    }
    
    // Find deprecated terms in the document
    const deprecatedFindings = findDeprecatedTerms(file.content, context.glossaryTerms);
    
    for (const finding of deprecatedFindings) {
      results.push({
        ruleId: 'quality-005-terminology',
        filePath: file.path,
        line: finding.line,
        severity: 'medium',
        status: 'fail',
        message: `Deprecated term "${finding.term}" found - use canonical term "${finding.canonical}" instead`,
        suggestedFix: `Replace "${finding.term}" with "${finding.canonical}" for consistency with glossary`,
        context: finding.context,
      });
    }
    
    return results;
  },
};

