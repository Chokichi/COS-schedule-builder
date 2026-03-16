#!/usr/bin/env node

/**
 * Update Basic Schedule Metadata
 *
 * Usage:
 * 1. Paste the new HTML table into public/basic-schedule.html
 * 2. Run: npm run update-schedule
 * 3. Enter the academic year and term when prompted (e.g., 2026, Fall)
 *
 * This script updates src/scheduleConfig.json, which is used by:
 * - The main header in App.tsx
 * - The \"Use Basic Schedule\" section in ImportModal.tsx
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const projectRoot = path.join(__dirname, '..');
const configPath = path.join(projectRoot, 'src', 'scheduleConfig.json');

function readCurrentConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      year: parsed.year || new Date().getFullYear(),
      term: parsed.term || 'Fall',
    };
  } catch (e) {
    return {
      year: new Date().getFullYear(),
      term: 'Fall',
    };
  }
}

function writeConfig(year, term) {
  const data = {
    year,
    term,
  };
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function prompt(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const fullQuestion = defaultValue
    ? `${question} [${defaultValue}]: `
    : `${question}: `;

  const answer = await new Promise((resolve) => {
    rl.question(fullQuestion, (ans) => resolve(ans.trim()));
  });

  rl.close();
  return answer || defaultValue;
}

async function main() {
  const current = readCurrentConfig();

  console.log('🗓  Basic Schedule Update');
  console.log('--------------------------------');
  console.log('Make sure you have already pasted the new HTML table into:');
  console.log('  public/basic-schedule.html\n');

  const yearInput = await prompt('Enter academic year', String(current.year));
  const year = parseInt(yearInput, 10);
  if (Number.isNaN(year) || year < 2000 || year > 3000) {
    console.error('❌ Invalid year. Please enter a valid numeric year (e.g., 2026).');
    process.exit(1);
  }

  const term = await prompt('Enter term (e.g., Fall, Spring, Summer)', current.term);

  writeConfig(year, term);

  console.log('\n✅ Updated src/scheduleConfig.json with:');
  console.log(`   year: ${year}`);
  console.log(`   term: ${term}`);
  console.log('\nThese values are now used in:');
  console.log('- Header: \"Student Schedule Builder — <term> <year>\"');
  console.log('- Import modal: \"Use our <term> <year> basic schedule instead\" and warning text');
  console.log('\nRebuild or refresh your dev server to see the changes.');
}

main().catch((err) => {
  console.error('❌ Failed to update basic schedule metadata:', err);
  process.exit(1);
});

