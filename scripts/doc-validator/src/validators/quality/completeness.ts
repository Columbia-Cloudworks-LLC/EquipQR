/**
 * Completeness Validators
 * 
 * Validates documentation completeness: required sections, code examples, vague language
 */

import { visit } from 'unist-util-visit';
import type { ValidationRule } from '../../models/ValidationRule.js';
import type { DocumentationFile } from '../../models/DocumentationFile.js';
import type { ValidationResult } from '../../models/ValidationResult.js';
import type { ValidationContext } from '../../utils/validation-context.js';

/**
 * Required sections by document type
 */
const REQUIRED_SECTIONS: Record<string, string[]> = {
  architecture: ['Overview', 'Design', 'Schema'],
  feature: ['User Scenarios', 'Requirements'],
  deployment: ['Prerequisites', 'Steps'],
  guide: ['Overview'],
};

/**
 * Required Sections Validator
 * 
 * Rule: quality-002-required-sections
 * Checks for mandatory sections based on document type
 */
export const requiredSectionsValidator: ValidationRule = {
  id: 'quality-002-required-sections',
  category: 'quality',
  name: 'Required Sections',
  description: 'Checks for mandatory sections based on document type',
  severity: 'critical',
  appliesToTypes: ['architecture', 'feature', 'deployment', 'guide'],
  
  async validate(file: DocumentationFile, _context: ValidationContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Get required sections for this document type
    const requiredSections = REQUIRED_SECTIONS[file.type];
    if (!requiredSections || requiredSections.length === 0) {
      return results; // No required sections for this type
    }
    
    if (!file.ast) {
      return results;
    }
    
    // Extract all headings from the document
    const headings: string[] = [];
    visit(file.ast, 'heading', (node: any) => {
      // Get heading text
      const text = node.children
        ?.map((child: any) => child.value || '')
        .join('')
        .trim();
      if (text) {
        headings.push(text);
      }
    });
    
    // Check for missing required sections
    for (const requiredSection of requiredSections) {
      const found = headings.some(heading => 
        heading.toLowerCase() === requiredSection.toLowerCase() ||
        heading.toLowerCase().includes(requiredSection.toLowerCase())
      );
      
      if (!found) {
        results.push({
          ruleId: 'quality-002-required-sections',
          filePath: file.path,
          severity: 'critical',
          status: 'fail',
          message: `Missing required section: "${requiredSection}" for ${file.type} documentation`,
          suggestedFix: `Add a section with heading "## ${requiredSection}" to the document`,
        });
      }
    }
    
    return results;
  },
};

/**
 * Code Examples Validator
 * 
 * Rule: quality-003-code-examples
 * Verifies presence of code examples in API/guide documents
 */
export const codeExamplesValidator: ValidationRule = {
  id: 'quality-003-code-examples',
  category: 'quality',
  name: 'Code Examples',
  description: 'Verifies presence of code examples in API and guide documents',
  severity: 'high',
  appliesToTypes: ['reference', 'guide'],
  
  async validate(file: DocumentationFile, _context: ValidationContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    if (!file.ast) {
      return results;
    }
    
    // Check if document contains code blocks
    let hasCodeBlock = false;
    visit(file.ast, 'code', (_node: any) => {
      hasCodeBlock = true;
    });
    
    if (!hasCodeBlock) {
      results.push({
        ruleId: 'quality-003-code-examples',
        filePath: file.path,
        severity: 'high',
        status: 'fail',
        message: `${file.type} documentation should include code examples`,
        suggestedFix: 'Add code examples to illustrate usage or concepts',
      });
    }
    
    return results;
  },
};

/**
 * Vague language patterns to detect
 */
const VAGUE_TERMS = [
  'robust',
  'intuitive',
  'easy',
  'simple',
  'fast',
  'quick',
  'powerful',
  'flexible',
  'seamless',
  'efficient',
  'elegant',
  'scalable', // Without specific metrics
];

/**
 * Vague Language Detector
 * 
 * Rule: quality-006-vague-language
 * Flags untestable language in requirement documents
 */
export const vagueLanguageDetector: ValidationRule = {
  id: 'quality-006-vague-language',
  category: 'quality',
  name: 'Vague Language',
  description: 'Detects untestable vague language in documentation',
  severity: 'low',
  appliesToTypes: ['feature'], // Primarily for requirements
  
  async validate(file: DocumentationFile, _context: ValidationContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const vagueTerm of VAGUE_TERMS) {
      // Use word boundary regex to match whole words only
      const regex = new RegExp(`\\b${vagueTerm}\\b`, 'gi');
      const matches = file.content.match(regex);
      
      if (matches && matches.length > 0) {
        // Find approximate line number
        const lines = file.content.split('\n');
        let lineNumber: number | undefined;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(vagueTerm)) {
            lineNumber = i + 1;
            break;
          }
        }
        
        results.push({
          ruleId: 'quality-006-vague-language',
          filePath: file.path,
          line: lineNumber,
          severity: 'low',
          status: 'fail',
          message: `Vague term "${vagueTerm}" found - use concrete, testable language instead`,
          suggestedFix: `Replace "${vagueTerm}" with specific, measurable criteria (e.g., "processes requests in <200ms" instead of "fast")`,
          context: matches[0],
        });
      }
    }
    
    return results;
  },
};

