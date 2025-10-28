/**
 * Validation Context Builder
 * 
 * Builds the context object passed to all validation rules
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { loadConfig } from './config.js';
import { ExemptionsConfigSchema, type ExemptionsConfig } from '../models/Exemptions.js';
import { GlossarySchema, type Glossary, type GlossaryTerm } from '../models/Glossary.js';
import type { ValidationConfig } from '../models/ValidationConfig.js';
import type { DocumentationFile } from '../models/DocumentationFile.js';

/**
 * External link metadata for caching
 */
export interface ExternalLink {
  url: string;
  domain: string;
  sourceFile: string;
  lastValidated: Date | null;
  status: 'active' | 'broken' | 'deprecated' | 'exempted' | 'unchecked';
  statusCode?: number;
  exempted: boolean;
}

/**
 * Validation context passed to all validation rules
 */
export interface ValidationContext {
  repositoryRoot: string;
  changedFiles: string[];
  allDocumentationFiles: DocumentationFile[];
  glossaryTerms: GlossaryTerm[];
  externalLinkCache: Map<string, ExternalLink>;
  exemptions: ExemptionsConfig;
  config: ValidationConfig;
}

/**
 * Load glossary from .doc-validator/glossary.yaml
 * Returns empty glossary if file doesn't exist
 * 
 * @param repositoryRoot - Absolute path to repository root
 * @returns Parsed and validated glossary
 */
function loadGlossary(repositoryRoot: string): Glossary {
  const glossaryPath = join(repositoryRoot, '.doc-validator', 'glossary.yaml');
  
  if (!existsSync(glossaryPath)) {
    console.warn(`Glossary file not found: ${glossaryPath}`);
    console.warn('Using empty glossary');
    return { schema_version: '1.0', terms: [] };
  }
  
  try {
    const content = readFileSync(glossaryPath, 'utf-8');
    const rawGlossary = parseYaml(content);
    
    // Validate using Zod schema
    const glossary = GlossarySchema.parse(rawGlossary);
    
    return glossary;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      console.error('Glossary validation failed:', (error as any).issues);
    } else {
      console.error('Failed to parse glossary:', error);
    }
    
    return { schema_version: '1.0', terms: [] };
  }
}

/**
 * Load exemptions from .doc-validator/exemptions.json
 * Returns default exemptions if file doesn't exist
 * 
 * @param repositoryRoot - Absolute path to repository root
 * @returns Parsed and validated exemptions
 */
function loadExemptions(repositoryRoot: string): ExemptionsConfig {
  const exemptionsPath = join(repositoryRoot, '.doc-validator', 'exemptions.json');
  
  if (!existsSync(exemptionsPath)) {
    console.warn(`Exemptions file not found: ${exemptionsPath}`);
    console.warn('Using default exemptions');
    return ExemptionsConfigSchema.parse({});
  }
  
  try {
    const content = readFileSync(exemptionsPath, 'utf-8');
    const rawExemptions = JSON.parse(content);
    
    // Validate using Zod schema
    const exemptions = ExemptionsConfigSchema.parse(rawExemptions);
    
    return exemptions;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      console.error('Exemptions validation failed:', (error as any).issues);
    } else {
      console.error('Failed to parse exemptions:', error);
    }
    
    return ExemptionsConfigSchema.parse({});
  }
}

/**
 * Build validation context from repository state
 * 
 * @param repositoryRoot - Absolute path to repository root
 * @param changedFiles - Files changed in current PR (for incremental validation)
 * @param allDocumentationFiles - All discovered documentation files
 * @returns Complete validation context
 */
export function buildValidationContext(
  repositoryRoot: string,
  changedFiles: string[],
  allDocumentationFiles: DocumentationFile[]
): ValidationContext {
  // Load configuration and resources
  const config = loadConfig(repositoryRoot);
  const glossary = loadGlossary(repositoryRoot);
  const exemptions = loadExemptions(repositoryRoot);
  
  // Initialize external link cache (empty for now, will be populated during validation)
  const externalLinkCache = new Map<string, ExternalLink>();
  
  return {
    repositoryRoot,
    changedFiles,
    allDocumentationFiles,
    glossaryTerms: glossary.terms,
    externalLinkCache,
    exemptions,
    config,
  };
}

