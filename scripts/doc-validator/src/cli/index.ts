#!/usr/bin/env node

/**
 * Documentation Validator CLI
 * 
 * Main entry point for the documentation validation tool
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { validateCommand } from './commands/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('doc-validate')
  .description('Documentation validation and quality assurance system')
  .version(packageJson.version);

// Register commands
program.addCommand(validateCommand);

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

