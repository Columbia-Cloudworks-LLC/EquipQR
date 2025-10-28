/**
 * Validate Command
 * 
 * Main validation command - runs documentation quality checks
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { 
  incrementalOption, 
  externalLinksOption, 
  reportOption, 
  configOption,
  verboseOption,
  repositoryRootOption 
} from '../options.js';
import { loadConfig } from '../../utils/config.js';
import { discoverDocumentationFiles, readFile, getRelativePath } from '../../utils/file-system.js';
import { createDocumentationFile, getExemptionReason } from '../../models/DocumentationFileFactory.js';
import { buildValidationContext } from '../../utils/validation-context.js';
import { validateFiles } from '../../utils/validation-runner.js';
import { generateMetricsReport } from '../../utils/metrics.js';
import { printConsoleReport } from '../../reporters/console.js';
import { writeJsonReport } from '../../reporters/json.js';
import type { ValidationReport } from '../../models/ValidationResult.js';
import type { ValidationRule } from '../../models/ValidationRule.js';

// Import all quality validators
import { internalLinkValidator, externalLinkValidator } from '../../validators/quality/links.js';
import { 
  requiredSectionsValidator, 
  codeExamplesValidator, 
  vagueLanguageDetector 
} from '../../validators/quality/completeness.js';
import { terminologyConsistencyValidator } from '../../validators/quality/terminology.js';

/**
 * Get all validation rules
 */
function getAllValidationRules(includeExternalLinks: boolean): ValidationRule[] {
  const rules: ValidationRule[] = [
    // Quality validators
    internalLinkValidator,
    requiredSectionsValidator,
    codeExamplesValidator,
    terminologyConsistencyValidator,
    vagueLanguageDetector,
  ];
  
  // Conditionally add external link validator
  if (includeExternalLinks) {
    rules.push(externalLinkValidator);
  }
  
  return rules;
}

/**
 * Validate command implementation
 */
export const validateCommand = new Command('validate')
  .description('Validate documentation quality and consistency')
  .addOption(incrementalOption)
  .addOption(externalLinksOption)
  .addOption(reportOption)
  .addOption(configOption)
  .addOption(verboseOption)
  .addOption(repositoryRootOption)
  .action(async (options) => {
    const repositoryRoot = resolve(options.root);
    
    console.log('🔍 Starting documentation validation...\n');
    
    if (options.verbose) {
      console.log(`Repository root: ${repositoryRoot}`);
      console.log(`Incremental mode: ${options.incremental}`);
      console.log(`External links: ${options.externalLinks}\n`);
    }
    
    try {
      // Load configuration
      const config = loadConfig(repositoryRoot);
      
      // Override incremental mode if specified
      if (options.incremental) {
        config.incremental = true;
      }
      
      // Discover documentation files
      console.log('📂 Discovering documentation files...');
      const absoluteFilePaths = discoverDocumentationFiles(repositoryRoot, config);
      
      if (absoluteFilePaths.length === 0) {
        console.log('⚠️  No documentation files found');
        process.exit(0);
      }
      
      console.log(`Found ${absoluteFilePaths.length} documentation files\n`);
      
      // Parse documentation files
      console.log('📖 Parsing documentation files...');
      const documentationFiles = [];
      const exemptedFiles = [];
      
      for (const absolutePath of absoluteFilePaths) {
        const relativePath = getRelativePath(absolutePath, repositoryRoot);
        const content = readFile(absolutePath);
        
        const file = createDocumentationFile(absolutePath, relativePath, content);
        
        // Check if file should be exempted
        const exemptionReason = getExemptionReason(file);
        if (exemptionReason) {
          exemptedFiles.push({ path: file.path, reason: exemptionReason });
          if (options.verbose) {
            console.log(`  ⏭️  Exempted: ${file.path} (${exemptionReason})`);
          }
        } else {
          documentationFiles.push(file);
        }
      }
      
      console.log(`Parsed ${documentationFiles.length} files (${exemptedFiles.length} exempted)\n`);
      
      // Build validation context
      const changedFiles: string[] = []; // TODO: Implement git diff for incremental mode
      const context = buildValidationContext(repositoryRoot, changedFiles, documentationFiles);
      
      // Get validation rules
      const rules = getAllValidationRules(options.externalLinks);
      
      console.log(`Running ${rules.length} validation rules...\n`);
      
      // Execute validation
      const { results, stats } = await validateFiles(documentationFiles, rules, context);
      
      // Generate metrics report
      const metricsReport = generateMetricsReport(
        results,
        documentationFiles.length,
        config.incremental ? 'incremental' : 'full',
        stats.rulesExecuted,
        {
          quality: stats.rulesExecuted, // Simplified for now
          sync: 0,
          structure: 0,
          accessibility: 0,
        }
      );
      
      // Create complete validation report
      const validationReport: ValidationReport = {
        metrics: metricsReport,
        results,
        validatedFiles: documentationFiles.map(f => f.path),
        exemptedFiles,
        externalLinks: options.externalLinks 
          ? Array.from(context.externalLinkCache.values()).map(link => ({
              url: link.url,
              status: link.status,
              statusCode: link.statusCode,
              sourceFile: link.sourceFile,
            }))
          : undefined,
      };
      
      // Display console report
      printConsoleReport(validationReport);
      
      // Write JSON report
      const reportPath = resolve(repositoryRoot, options.report);
      writeJsonReport(validationReport, reportPath);
      
      console.log('\n✅ Validation complete');
      
      // Exit with success (advisory-only, never fail builds)
      process.exit(0);
      
    } catch (error) {
      console.error('\n❌ Validation failed with error:');
      console.error(error);
      process.exit(1);
    }
  });

