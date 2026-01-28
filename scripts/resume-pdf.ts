#!/usr/bin/env npx tsx
/**
 * Resume PDF Generator CLI
 *
 * Usage:
 *   npx tsx scripts/resume-pdf.ts --input <markdown> --output <pdf>
 *   npx tsx scripts/resume-pdf.ts --help
 *
 * Examples:
 *   npx tsx scripts/resume-pdf.ts --input src/docs/Thomas_To_Beacon_Hill.md --output src/docs/Thomas_To_Beacon_Hill.pdf
 *
 * Exit codes:
 *   0 - Success
 *   1 - User error (invalid args, file not found)
 *   2 - Generation error
 */

import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

// Types
interface CLIArgs {
  command: 'generate' | 'help';
  input?: string;
  output?: string;
  dryRun: boolean;
}

// Terminal colors
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function formatSuccess(message: string): string {
  return `${COLORS.green}✓${COLORS.reset} ${message}`;
}

function formatError(message: string): string {
  return `${COLORS.red}✗${COLORS.reset} ${message}`;
}

function formatHeader(title: string): string {
  return `\n${COLORS.bold}${title}${COLORS.reset}\n${'─'.repeat(title.length)}\n`;
}

// Parse CLI arguments
function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    command: 'generate',
    dryRun: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === 'help' || arg === '--help' || arg === '-h') {
      args.command = 'help';
    } else if (arg === '--input' || arg === '-i') {
      args.input = argv[++i];
    } else if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--dry-run' || arg === '-n') {
      args.dryRun = true;
    }
    i++;
  }

  return args;
}

// Print usage help
function printUsage(): void {
  console.log(`
Resume PDF Generator - Convert markdown resume to professional PDF

USAGE:
  npx tsx scripts/resume-pdf.ts [options]

OPTIONS:
  --input, -i <path>    Input markdown file (required)
  --output, -o <path>   Output PDF file (required)
  --dry-run, -n         Preview HTML without generating PDF
  --help, -h            Show this help message

EXAMPLES:
  # Generate PDF from markdown
  npx tsx scripts/resume-pdf.ts --input src/docs/resume.md --output src/docs/resume.pdf

  # Preview HTML (dry run)
  npx tsx scripts/resume-pdf.ts --input src/docs/resume.md --output src/docs/resume.pdf --dry-run
`);
}

// Convert markdown to HTML with professional styling (matching Thomas_To_Resume.pdf format)
function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const nameLine = lines[0].replace(/^#\s*/, '');
  const contactLine = lines[1] || '';

  // Parse contact info (already comma-separated, convert markdown links)
  const contactHtml = contactLine
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Remove header lines from content
  const bodyMarkdown = lines.slice(2).join('\n');

  // Process line by line to handle different sections
  const bodyLines = bodyMarkdown.split('\n');
  const htmlLines: string[] = [];
  let inList = false;

  for (let i = 0; i < bodyLines.length; i++) {
    let line = bodyLines[i];

    // Section headers
    if (line.match(/^## /)) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h2>${line.replace(/^## /, '')}</h2>`);
      continue;
    }

    // Experience header: **Title**| **Company** | *Location* | *Date*
    const expMatch = line.match(/^\*\*([^*]+)\*\*\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*\*([^*]+)\*\s*\|\s*\*([^*]+)\*/);
    if (expMatch) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<div class="experience-header"><strong>${expMatch[1]}</strong> | <strong>${expMatch[2]}</strong> | <em>${expMatch[3]}</em> | <em>${expMatch[4]}</em></div>`);
      continue;
    }

    // Bullet points
    if (line.match(/^\* /)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      // Process inline markdown (bold, italic, links)
      let content = line.replace(/^\* /, '');
      content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      htmlLines.push(`<li>${content}</li>`);
      continue;
    }

    // Skills paragraph (starts with **Category:**)
    if (line.match(/^\*\*[^*]+:\*\*/)) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      let content = line;
      content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      htmlLines.push(`<p>${content}</p>`);
      continue;
    }

    // Plain text (education lines, etc.)
    if (line.trim() && !line.match(/^#/)) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      let content = line;
      content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      htmlLines.push(`<p>${content}</p>`);
      continue;
    }

    // Empty line - close list if open
    if (!line.trim() && inList) {
      htmlLines.push('</ul>');
      inList = false;
    }
  }

  if (inList) {
    htmlLines.push('</ul>');
  }

  const bodyHtml = htmlLines.join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: letter;
      margin: 0.4in 0.5in;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 0;
    }
    .name {
      font-size: 18pt;
      font-weight: bold;
      margin: 0 0 2px 0;
      color: #000;
    }
    .contact {
      font-size: 10pt;
      color: #000;
      margin-bottom: 6px;
    }
    .contact a {
      color: #0066cc;
      text-decoration: underline;
    }
    h2 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 1px;
      margin: 10px 0 6px 0;
      color: #000;
    }
    .experience-header {
      margin: 8px 0 2px 0;
      font-size: 10.5pt;
    }
    .experience-header strong {
      font-weight: bold;
    }
    .experience-header em {
      font-style: italic;
    }
    ul {
      margin: 2px 0 6px 0;
      padding-left: 20px;
      list-style-type: disc;
    }
    li {
      margin-bottom: 2px;
      text-align: justify;
    }
    li::marker {
      font-size: 10pt;
    }
    a {
      color: #0066cc;
      text-decoration: underline;
    }
    strong {
      font-weight: bold;
    }
    em {
      font-style: italic;
    }
    p {
      margin: 4px 0;
      text-align: justify;
    }
    .skills-section p {
      margin: 2px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="name">${nameLine}</h1>
    <div class="contact">${contactHtml}</div>
  </div>
  ${bodyHtml}
</body>
</html>`;
}

// Generate PDF from HTML
async function generatePdf(html: string, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'letter',
    printBackground: true,
    margin: {
      top: '0.5in',
      right: '0.6in',
      bottom: '0.5in',
      left: '0.6in',
    },
  });

  await browser.close();
}

// Main entry point
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'help') {
    printUsage();
    process.exit(0);
  }

  // Validate arguments
  if (!args.input) {
    console.error(formatError('--input is required'));
    printUsage();
    process.exit(1);
  }

  if (!args.output) {
    console.error(formatError('--output is required'));
    printUsage();
    process.exit(1);
  }

  // Resolve paths
  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = path.resolve(process.cwd(), args.output);

  // Read markdown
  let markdown: string;
  try {
    markdown = await fs.readFile(inputPath, 'utf-8');
  } catch {
    console.error(formatError(`Input file not found: ${inputPath}`));
    process.exit(1);
  }

  console.log(formatHeader('Resume PDF Generator'));
  console.log(`Input:  ${args.input}`);
  console.log(`Output: ${args.output}`);

  // Convert to HTML
  const html = markdownToHtml(markdown);

  if (args.dryRun) {
    console.log(`\n${COLORS.yellow}Dry run - HTML preview:${COLORS.reset}\n`);
    console.log(html.slice(0, 500) + '...');
    console.log(formatSuccess('Dry run complete'));
    process.exit(0);
  }

  // Generate PDF
  try {
    await generatePdf(html, outputPath);
    console.log(formatSuccess(`PDF generated: ${outputPath}`));
  } catch (error) {
    console.error(formatError(`PDF generation failed: ${(error as Error).message}`));
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(formatError(`Unexpected error: ${error.message}`));
  process.exit(1);
});
