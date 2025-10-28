/**
 * Glossary Schema
 * 
 * TypeScript/Zod schema for .doc-validator/glossary.yaml
 * Validates canonical terminology structure
 */

import { z } from 'zod';

/**
 * Single glossary term definition
 */
export const GlossaryTermSchema = z.object({
  term: z.string().min(1), // Canonical term name
  definition: z.string().min(1), // Clear definition
  category: z.string().optional(), // Grouping (e.g., "Domain Model")
  synonyms: z.array(z.string()).default([]), // Approved alternatives
  deprecatedTerms: z.array(z.string()).default([]), // Old terms to flag
  usage: z.string().optional(), // Usage guidance
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

/**
 * Complete glossary file structure
 */
export const GlossarySchema = z.object({
  schema_version: z.string().default('1.0'),
  terms: z.array(GlossaryTermSchema),
}).refine(
  (data) => {
    // Validation: term names must be unique
    const termNames = data.terms.map(t => t.term.toLowerCase());
    return termNames.length === new Set(termNames).size;
  },
  {
    message: 'Glossary terms must have unique names',
  }
).refine(
  (data) => {
    // Validation: synonyms must not conflict with other canonical terms
    const canonicalTerms = new Set(data.terms.map(t => t.term.toLowerCase()));
    for (const term of data.terms) {
      for (const synonym of term.synonyms) {
        if (canonicalTerms.has(synonym.toLowerCase()) && synonym.toLowerCase() !== term.term.toLowerCase()) {
          return false;
        }
      }
    }
    return true;
  },
  {
    message: 'Synonyms must not conflict with other canonical terms',
  }
).refine(
  (data) => {
    // Validation: deprecated terms should not appear as canonical terms
    const canonicalTerms = new Set(data.terms.map(t => t.term.toLowerCase()));
    for (const term of data.terms) {
      for (const deprecated of term.deprecatedTerms) {
        if (canonicalTerms.has(deprecated.toLowerCase())) {
          return false;
        }
      }
    }
    return true;
  },
  {
    message: 'Deprecated terms must not appear as canonical terms',
  }
);

export type Glossary = z.infer<typeof GlossarySchema>;

