#!/usr/bin/env npx tsx
/**
 * Resume PDF Generator
 *
 * Converts src/docs/resume.md to PDF using md-to-pdf.
 *
 * Usage:
 *   npx tsx scripts/resume-pdf.ts [--output <filename>]
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function parseArgs(argv: string[]): { output: string } {
  const args = { output: 'Thomas_To_Resume' };
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--output' || argv[i] === '-o') && argv[i + 1]) {
      args.output = argv[++i];
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(new URL('.', import.meta.url).pathname, '..');
  const resumeMd = path.join(projectRoot, 'src', 'docs', 'resume.md');
  const generatedPdf = path.join(projectRoot, 'src', 'docs', 'resume.pdf');
  const outputPdf = path.join(projectRoot, `${args.output}.pdf`);

  console.log(`Converting resume.md → ${args.output}.pdf`);

  execSync(`npx md-to-pdf "${resumeMd}"`, { cwd: projectRoot, stdio: 'inherit' });

  fs.renameSync(generatedPdf, outputPdf);

  console.log(`✓ PDF generated: ${outputPdf}`);
}

main().catch((error) => {
  console.error(`✗ Error: ${error.message}`);
  process.exit(1);
});
