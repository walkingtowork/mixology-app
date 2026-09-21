// Compares an ESLint JSON report against a standing baseline of known problems.
//
// This repo carries 8 pre-existing problems (7 errors, 1 warning) -- `no-explicit-any`
// and `set-state-in-effect` issues that predate CI. A plain `eslint .` exits non-zero on
// any error, so it could never gate anything here. This script instead fails only when
// the count goes UP, which is the thing worth catching.
//
// When you fix some, lower BASELINE. It should only ever ratchet downwards.
import { readFileSync } from 'node:fs';

const BASELINE = 8;
const report = JSON.parse(readFileSync('eslint-report.json', 'utf8'));

const errors = report.reduce((n, file) => n + file.errorCount, 0);
const warnings = report.reduce((n, file) => n + file.warningCount, 0);
const total = errors + warnings;

for (const file of report) {
  if (file.errorCount || file.warningCount) {
    const name = file.filePath.split('/frontend/').pop();
    console.log(`  ${name}: ${file.errorCount} error(s), ${file.warningCount} warning(s)`);
  }
}
console.log(`\neslint: ${errors} error(s), ${warnings} warning(s) -- total ${total}, baseline ${BASELINE}`);

if (total > BASELINE) {
  console.error(`\nFAIL: ${total - BASELINE} new lint problem(s) introduced.`);
  process.exit(1);
}
if (total < BASELINE) {
  console.log(`\nBelow baseline. Lower BASELINE in this file to ${total} to lock the improvement in.`);
}
