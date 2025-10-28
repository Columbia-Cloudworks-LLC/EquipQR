/**
 * CLI Options
 * 
 * Common CLI option definitions for commands
 */

import { Option } from 'commander';

/**
 * Incremental validation option
 * Only validate changed files (PR context)
 */
export const incrementalOption = new Option(
  '--incremental',
  'Only validate files changed in current branch (incremental mode)'
).default(false);

/**
 * External links validation option
 * Enable external link checking (slower due to rate limiting)
 */
export const externalLinksOption = new Option(
  '--external-links',
  'Validate external links (includes HTTP checks with rate limiting)'
).default(false);

/**
 * Report output path option
 * Specify custom path for JSON report
 */
export const reportOption = new Option(
  '--report <path>',
  'Path to save JSON validation report'
).default('.doc-validator/reports/latest.json');

/**
 * Config file option
 * Specify custom configuration file path
 */
export const configOption = new Option(
  '--config <path>',
  'Path to configuration file'
).default('.doc-validator/config.json');

/**
 * Verbose output option
 * Enable detailed validation output
 */
export const verboseOption = new Option(
  '-v, --verbose',
  'Enable verbose output with detailed validation steps'
).default(false);

/**
 * Repository root option
 * Override repository root directory
 */
export const repositoryRootOption = new Option(
  '--root <path>',
  'Repository root directory'
).default(process.cwd());

