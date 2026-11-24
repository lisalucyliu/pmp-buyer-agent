// Week 7 grading. 0 paid requests: this script reads saved runs and never calls Claude.
//
// Mode 1, make the grading table from 3 or more run folders (each made by scripts/run_agent.js):
//   node scripts/grade_runs.js runs/2026-11-23-evals-1 runs/2026-11-23-evals-2 runs/2026-11-23-evals-3
//   Writes runs/<date>-evals/grades.md: one row per case per run, with the code checks filled in and
//   2 empty columns for Lisa. It never writes over a grades.md that exists (Lisa's grades are in it).
//   Also writes grades-read.md in the same folder: a reading view grouped by case (Lisa, Nov 22).
//   --out <folder> writes both files to that folder instead, for example:
//   node scripts/grade_runs.js --out runs/2026-11-22-after runs/2026-11-22-after-1 runs/2026-11-22-after-2 runs/2026-11-22-after-3
//
// Mode 2, score the table after Lisa fills it:
//   node scripts/grade_runs.js --score runs/2026-11-23-evals/grades.md
//   A row passes only if all its code checks pass and Lisa wrote Pass. A case passes pass^3 only if
//   its row passes in every run (3 or more runs).
//
// The checks come from the case files (scripts/conversations/run-*/), so the approved checks are used.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runChecks } from './checks.js';
import { bubbleText, readConversations, seesText } from './run_agent.js';

export const MIN_RUNS = 3;
export const COLUMNS = ['Case', 'Run', 'What the buyer sees', 'lookFor', 'Code checks', 'All code checks', 'Lisa: Pass or Fail', 'Lisa: why'];

// All cases in run A, B and C, by ID.
export function readCases(runs = ['a', 'b', 'c']) {
  return Object.fromEntries(runs.flatMap((run) => readConversations(run)).map((c) => [c.id, c]));
}

export function readRunFolder(folder) {
  return readdirSync(folder)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(folder, name), 'utf8')));
}

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

// One row: the record of one case in one run.
export function gradeRow(record, runName, cases) {
  const theCase = cases[record.id];
  const checks = runChecks(record, theCase?.checks ?? []);
  const checkCell = checks.length
    ? checks.map((c, i) => `${i + 1}. ${c.pass ? 'Pass' : 'Fail'}: ${c.label}`).join('\n')
    : 'No code checks';
  const allPass = checks.every((c) => c.pass);
  return {
    caseId: record.id,
    run: runName,
    cells: [record.id, runName, seesText(record, { withPrompts: true }), theCase?.lookFor ?? record.lookFor ?? '', checkCell, allPass ? 'Pass' : 'Fail', '', ''],
  };
}

export function gradesMarkdown(runs, cases, title) {
  const rows = runs.flatMap(({ name, records }) => records.map((record) => gradeRow(record, name, cases)));
  rows.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.run.localeCompare(b.run));
  return [
    `# ${title}`,
    '',
    `${runs.length} runs: ${runs.map((r) => r.name).join(', ')}. ${rows.length} rows.`,
    '',
    'Fill in the last 2 columns for each row. Write Pass or Fail in "Lisa: Pass or Fail".',
    'Then run: node scripts/grade_runs.js --score <this file>',
    '',
    `| ${COLUMNS.join(' | ')} |`,
    `| ${COLUMNS.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.cells.map(cell).join(' | ')} |`),
    '',
  ].join('\n');
}

// Splits a table line into cells. "\|" inside a cell is text, not a cell border.
// The "You grade" line of each case, from docs/evals-week-7-checks.md, by short ID (A1, B4, ...).
// Also the heading words in parentheses, for example "A1 (VPN search)".
export function readGradeNotes(markdown) {
  const notes = {};
  let current = null;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^## ([A-C]\d+) \((.+)\)\s*$/);
    if (heading) {
      current = heading[1];
      notes[current] = { title: heading[2], youGrade: '' };
      continue;
    }
    if (line.startsWith('## ')) current = null;
    if (current && line.startsWith('You grade:')) notes[current].youGrade = line.slice('You grade:'.length).trim();
  }
  return notes;
}

const shortId = (id) => id.split('-')[0];

// Quote lines for one record: each step's buyer message, then each bubble, the List and the Prompts
// on separate lines.
function recordQuote(record) {
  const out = [];
  record.steps.forEach((s, i) => {
    const said = s.say ? `Buyer: "${s.say}"` : s.choose ? `Buyer chooses: "${s.choose}"` : null;
    const parts = [
      ...(said ? [`**Step ${i + 1}.** ${said}`] : [`**Step ${i + 1}.**`]),
      ...(s.buyerSees ? s.buyerSees.bubbles.map(bubbleText) : s.card ? [`Card: ${s.cardState}`] : []),
      ...(s.buyerSees?.prompts?.length ? [`Prompts: ${s.buyerSees.prompts.join(', ')}`] : []),
      ...(s.error ? [`Error: ${s.error?.message ?? s.error}`] : []),
    ];
    out.push(...parts);
  });
  return out.map((line) => `> ${String(line).replace(/\n/g, ' ')}`).join('\n>\n');
}

// grades-read.md: a reading view grouped by case. Heading per case, the lookFor and "You grade" lines
// once, then each run as a quote, and the failed checks under each run that failed.
export function readingMarkdown(runs, cases, title, notes = {}) {
  const ids = [...new Set(runs.flatMap((r) => r.records.map((rec) => rec.id)))].sort();
  const out = [`# ${title}: reading view`, '', `${runs.length} runs: ${runs.map((r) => r.name).join(', ')}. Grouped by case. Grade in grades.md.`];
  for (const id of ids) {
    const note = notes[shortId(id)] ?? {};
    const theCase = cases[id];
    out.push('', `## ${shortId(id)}${note.title ? ` (${note.title})` : ''}`, '', `Case file: ${id}`, '');
    out.push(`**lookFor:** ${theCase?.lookFor ?? '-'}`, '', `**You grade:** ${note.youGrade || '-'}`);
    runs.forEach((run, i) => {
      const record = run.records.find((rec) => rec.id === id);
      if (!record) {
        out.push('', `### Run ${i + 1} (${run.name}): no record`);
        return;
      }
      const checks = runChecks(record, theCase?.checks ?? []);
      const failed = checks.filter((c) => !c.pass);
      out.push('', `### Run ${i + 1} (${run.name}): code checks ${failed.length ? 'Fail' : 'Pass'} (${checks.length - failed.length} of ${checks.length})`, '', recordQuote(record));
      if (failed.length) out.push('', 'Failed checks:', '', ...failed.map((c) => `- ${c.label}`));
    });
  }
  return `${out.join('\n')}\n`;
}

export function splitRow(line) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let current = '';
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] === '\\' && inner[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (inner[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += inner[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

// Reads the rows of a filled-in grades.md.
export function parseGrades(markdown) {
  const lines = markdown.split('\n').filter((line) => line.trim().startsWith('|'));
  const header = splitRow(lines[0] ?? '');
  const at = (name) => {
    const index = header.indexOf(name);
    if (index === -1) throw new Error(`grades.md has no "${name}" column`);
    return index;
  };
  const col = { caseId: at('Case'), run: at('Run'), code: at('All code checks'), lisa: at('Lisa: Pass or Fail'), why: at('Lisa: why') };
  return lines.slice(2).map((line) => {
    const cells = splitRow(line);
    return { caseId: cells[col.caseId], run: cells[col.run], code: cells[col.code], lisa: cells[col.lisa] ?? '', why: cells[col.why] ?? '' };
  });
}

const word = (text) => String(text ?? '').trim().toLowerCase().replace(/[.!]$/, '');

// pass^3: a row passes only if all code checks pass and Lisa wrote Pass. A case passes only if it has
// a passing row in every run, and there are at least 3 runs.
export function scoreGrades(rows) {
  const runs = [...new Set(rows.map((r) => r.run))].sort();
  const caseIds = [...new Set(rows.map((r) => r.caseId))].sort();
  const cases = caseIds.map((caseId) => {
    const perRun = runs.map((run) => {
      const row = rows.find((r) => r.caseId === caseId && r.run === run);
      if (!row) return { run, result: 'missing' };
      const lisa = word(row.lisa);
      if (lisa !== 'pass' && lisa !== 'fail') return { run, result: 'not graded', code: row.code };
      const pass = word(row.code) === 'pass' && lisa === 'pass';
      return { run, result: pass ? 'pass' : 'fail', code: row.code, lisa: row.lisa, why: row.why };
    });
    const passes = perRun.filter((r) => r.result === 'pass').length;
    const graded = perRun.every((r) => r.result === 'pass' || r.result === 'fail');
    return { caseId, perRun, passes, graded, pass: runs.length >= MIN_RUNS && passes === runs.length };
  });
  return { runs, cases, passed: cases.filter((c) => c.pass).length, enoughRuns: runs.length >= MIN_RUNS };
}

export function scoreText(score) {
  const out = [`Runs: ${score.runs.length} (${score.runs.join(', ')}).`];
  if (!score.enoughRuns) out.push(`Fewer than ${MIN_RUNS} runs, so no case can pass pass^3.`);
  out.push('', '| Case | Runs passed | pass^3 | Notes |', '| --- | --- | --- | --- |');
  for (const c of score.cases) {
    const notes = c.perRun
      .filter((r) => r.result !== 'pass')
      .map((r) => {
        if (r.result === 'missing') return `${r.run}: no row`;
        if (r.result === 'not graded') return `${r.run}: Lisa has not graded`;
        const why = [word(r.code) !== 'pass' ? 'code check failed' : null, word(r.lisa) !== 'pass' ? `Lisa: Fail${r.why ? ` (${r.why})` : ''}` : null].filter(Boolean).join(', ');
        return `${r.run}: ${why}`;
      })
      .join('; ');
    out.push(`| ${cell(c.caseId)} | ${c.passes} of ${score.runs.length} | ${c.pass ? 'Pass' : 'Fail'} | ${cell(notes || '-')} |`);
  }
  const notGraded = score.cases.filter((c) => !c.graded).length;
  out.push('', `Total: ${score.passed} of ${score.cases.length} cases pass pass^3.${notGraded ? ` ${notGraded} ${notGraded === 1 ? 'case has' : 'cases have'} rows that are not graded or not there.` : ''}`);
  return out.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--score') {
    if (!args[1]) throw new Error('Use: node scripts/grade_runs.js --score runs/<date>-evals/grades.md');
    console.log(scoreText(scoreGrades(parseGrades(readFileSync(args[1], 'utf8')))));
    return;
  }
  const outIndex = args.indexOf('--out');
  const outArg = outIndex === -1 ? null : args[outIndex + 1];
  if (outIndex !== -1 && !outArg) throw new Error('Use: --out runs/<folder>');
  const folders = outIndex === -1 ? args : args.filter((_, i) => i !== outIndex && i !== outIndex + 1);
  if (folders.length < MIN_RUNS) throw new Error(`Give ${MIN_RUNS} or more run folders. Use: node scripts/grade_runs.js [--out runs/<folder>] runs/<run 1> runs/<run 2> runs/<run 3>`);
  const runs = folders.map((folder) => ({ name: basename(resolve(folder)), records: readRunFolder(folder) }));
  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  const outFolder = outArg ? resolve(outArg) : resolve(new URL(`../runs/${date}-evals/`, import.meta.url).pathname);
  const shown = outArg ?? `runs/${date}-evals`;
  const title = outArg ? basename(outFolder) : `${date} evals`;
  // Never write over a file that exists: grades.md can hold Lisa's grades.
  for (const name of ['grades.md', 'grades-read.md']) {
    if (existsSync(join(outFolder, name))) throw new Error(`${shown}/${name} already exists. It can hold Lisa's grades, so it is not written over. Move it first.`);
  }
  const cases = readCases();
  const notes = readGradeNotes(readFileSync(new URL('../docs/evals-week-7-checks.md', import.meta.url), 'utf8'));
  mkdirSync(outFolder, { recursive: true });
  writeFileSync(join(outFolder, 'grades.md'), gradesMarkdown(runs, cases, title));
  writeFileSync(join(outFolder, 'grades-read.md'), readingMarkdown(runs, cases, title, notes));
  console.log(`Saved ${shown}/grades.md and ${shown}/grades-read.md (${runs.length} runs).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`Stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
