#!/usr/bin/env node

/**
 * Fetch the current COS Banner class-search dump and write:
 *   public/basic-schedule.html
 *   src/scheduleConfig.json
 *
 * Usage: npm run fetch-schedule
 */

const fs = require('fs');
const path = require('path');

const SEARCH_URL = 'https://banweb.cos.edu/prod/hzsched.p_search';
const USER_AGENT =
  'COS-schedule-builder/1.0 (personal student tool; +https://github.com/Chokichi/COS-schedule-builder)';
const REQUEST_TIMEOUT_MS = 120_000;
const SUBJECT_GAP_MS = 400;
const MIN_ALL_SUBJECT_CRNS = 100;
const MIN_TABLE_BYTES = 50_000;

const projectRoot = path.join(__dirname, '..');
const htmlPath = path.join(projectRoot, 'public', 'basic-schedule.html');
const configPath = path.join(projectRoot, 'src', 'scheduleConfig.json');

function log(message) {
  console.log(message);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function storeCookies(jar, headers) {
  const lines = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  for (const line of lines) {
    const pair = line.split(';', 1)[0];
    const eq = pair.indexOf('=');
    if (eq > 0) {
      jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1);
    }
  }
}

async function request(url, { method = 'GET', body, jar } = {}) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  };
  const cookie = cookieHeader(jar);
  if (cookie) headers.Cookie = cookie;
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers.Referer = SEARCH_URL;
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  storeCookies(jar, res.headers);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url} failed: HTTP ${res.status}`);
  }
  return text;
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  if (!match) return null;
  return decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
}

function hasFlag(tag, name) {
  return new RegExp(`\\s${name}(\\s|=|>|/)`, 'i').test(` ${tag} `) || new RegExp(`\\b${name}\\s*=`, 'i').test(tag);
}

function parseSelectOptions(innerHtml) {
  const options = [];
  const optionRe = /<option\b([^>]*)>/gi;
  let optionMatch;
  while ((optionMatch = optionRe.exec(innerHtml))) {
    const optionTag = `<option ${optionMatch[1]}>`;
    options.push({
      value: attr(optionTag, 'value') ?? '',
      selected: hasFlag(optionTag, 'selected'),
    });
  }
  return options;
}

function parseSearchForm(html) {
  const formMatch = html.match(/<form\b[^>]*action="[^"]*p_listthislist[^"]*"[^>]*>[\s\S]*?<\/form>/i);
  if (!formMatch) {
    throw new Error('Could not find the Banner search form (p_listthislist)');
  }

  const formTag = formMatch[0].match(/<form\b[^>]*>/i)[0];
  const action = attr(formTag, 'action');
  const formHtml = formMatch[0];
  const fields = [];
  let subjects = [];
  let allSubjectToken = null;

  const inputRe = /<input\b[^>]*>/gi;
  let inputMatch;
  while ((inputMatch = inputRe.exec(formHtml))) {
    const tag = inputMatch[0];
    const type = (attr(tag, 'type') || 'text').toLowerCase();
    const name = attr(tag, 'name');
    if (!name) continue;
    if (type === 'radio' || type === 'checkbox') {
      if (hasFlag(tag, 'checked')) {
        fields.push([name, attr(tag, 'value') ?? '']);
      }
      continue;
    }
    if (type === 'submit' || type === 'reset' || type === 'button' || type === 'image') continue;
    fields.push([name, attr(tag, 'value') ?? '']);
  }

  const selectRe = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  let selectMatch;
  while ((selectMatch = selectRe.exec(formHtml))) {
    const selectTag = `<select ${selectMatch[1]}>`;
    const name = attr(selectTag, 'name');
    if (!name) continue;
    const multiple = hasFlag(selectTag, 'multiple');
    const options = parseSelectOptions(selectMatch[2]);
    const selected = options.filter((opt) => opt.selected).map((opt) => opt.value);
    const values = selected.length > 0
      ? selected
      : (!multiple && options[0] ? [options[0].value] : []);

    if (name === 'sel_subj') {
      const realSubjects = options.map((opt) => opt.value).filter((value) => value && value !== 'dummy');
      subjects = realSubjects.filter((value) => value !== '%');
      allSubjectToken = realSubjects.includes('%') ? '%' : null;
    }

    for (const value of values) {
      fields.push([name, value]);
    }
  }

  const termCode = fields.find(([name]) => name === 'TERM')?.[1];
  const termDesc = fields.find(([name]) => name === 'TERM_DESC')?.[1];
  if (!termCode || !termDesc) {
    throw new Error('Search form is missing TERM / TERM_DESC');
  }

  return {
    listUrl: new URL(action, SEARCH_URL).href,
    fields,
    termCode,
    termDesc,
    subjects,
    allSubjectToken,
  };
}

function encodeBody(fields) {
  const params = new URLSearchParams();
  for (const [name, value] of fields) {
    params.append(name, value);
  }
  return params.toString();
}

function withSubjects(fields, subjectValues) {
  const without = [];
  let dummyCount = 0;
  for (const pair of fields) {
    if (pair[0] === 'sel_subj') {
      if (pair[1] === 'dummy') dummyCount += 1;
      continue;
    }
    without.push(pair);
  }
  const dummies = dummyCount > 0
    ? Array.from({ length: dummyCount }, () => ['sel_subj', 'dummy'])
    : [['sel_subj', 'dummy']];
  const insertAt = without.findIndex(([name]) => name === 'TERM_DESC') + 1;
  return [
    ...without.slice(0, insertAt),
    ...dummies,
    ...subjectValues.map((value) => ['sel_subj', value]),
    ...without.slice(insertAt),
  ];
}

function extractTable(html) {
  const tableOpen = html.match(/<table\b[^>]*class\s*=\s*["']?[^"'>]*dataentrytable[^>]*>/i);
  if (!tableOpen) return null;
  const start = tableOpen.index;
  const rest = html.slice(start);
  const tagRe = /<\/?table\b[^>]*>/gi;
  let depth = 0;
  let match;
  while ((match = tagRe.exec(rest))) {
    const isClose = /^<\//.test(match[0]);
    depth += isClose ? -1 : 1;
    if (isClose && depth === 0) {
      return rest.slice(0, match.index + match[0].length);
    }
  }
  return null;
}

function countCrns(html) {
  return (html.match(/p_course_popup/g) || []).length;
}

function tableLooksComplete(tableHtml) {
  if (!tableHtml) return false;
  if (tableHtml.length < MIN_TABLE_BYTES) return false;
  return countCrns(tableHtml) >= MIN_ALL_SUBJECT_CRNS;
}

function parseTermDesc(termDesc) {
  const match = termDesc.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) {
    throw new Error(`Unexpected TERM_DESC format: ${termDesc}`);
  }
  return {
    term: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(),
    year: parseInt(match[2], 10),
  };
}

function writeConfig({ year, term, termCode, fetchedAt }) {
  const data = { year, term, termCode, fetchedAt };
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function fetchAllAtOnce(listUrl, fields, jar) {
  log('Fetching full catalog (sel_subj=%) …');
  const html = await request(listUrl, { method: 'POST', body: encodeBody(fields), jar });
  const table = extractTable(html);
  const crns = table ? countCrns(table) : 0;
  log(`  all-subjects response: ${html.length} bytes, table=${table ? table.length : 0} bytes, CRNs=${crns}`);
  return table;
}

async function fetchBySubject(listUrl, fields, subjects, jar) {
  log(`Falling back to per-subject fetch (${subjects.length} subjects) …`);
  const chunks = [];
  let crns = 0;
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    const body = encodeBody(withSubjects(fields, [subject]));
    const html = await request(listUrl, { method: 'POST', body, jar });
    const table = extractTable(html);
    if (table) {
      const inner = table.replace(/^<table\b[^>]*>/i, '').replace(/<\/table>\s*$/i, '');
      chunks.push(inner);
      crns += countCrns(table);
    } else {
      log(`  ${subject}: no table`);
    }
    if ((i + 1) % 10 === 0 || i === subjects.length - 1) {
      log(`  ${i + 1}/${subjects.length} subjects, ${crns} CRNs so far`);
    }
    if (i < subjects.length - 1) {
      await sleep(SUBJECT_GAP_MS);
    }
  }
  if (chunks.length === 0) return null;
  return `<table class="dataentrytable" width="100%">\n${chunks.join('\n')}\n</table>`;
}

async function main() {
  log('Fetching COS class schedule');
  log('--------------------------------');

  const jar = {};
  const searchHtml = await request(SEARCH_URL, { jar });
  const form = parseSearchForm(searchHtml);
  log(`Current term: ${form.termDesc} (${form.termCode})`);
  log(`Subjects listed: ${form.subjects.length}`);

  let fields = form.fields;
  if (form.allSubjectToken) {
    fields = withSubjects(form.fields, [form.allSubjectToken]);
  }

  let table = null;
  try {
    table = await fetchAllAtOnce(form.listUrl, fields, jar);
  } catch (err) {
    log(`All-subjects fetch failed: ${err.message}`);
  }

  if (!tableLooksComplete(table)) {
    if (form.subjects.length === 0) {
      fail('All-subjects dump was incomplete and no subject list was found for fallback');
    }
    table = await fetchBySubject(form.listUrl, form.fields, form.subjects, jar);
  }

  if (!tableLooksComplete(table)) {
    fail('Did not receive a complete schedule table from COS');
  }

  const normalized = table.trim() + '\n';
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, normalized, 'utf8');

  const { year, term } = parseTermDesc(form.termDesc);
  const fetchedAt = new Date().toISOString();
  writeConfig({ year, term, termCode: form.termCode, fetchedAt });

  log(`Wrote ${htmlPath} (${normalized.length} bytes, ${countCrns(normalized)} CRNs)`);
  log(`Wrote ${configPath}`);
  log(`  year: ${year}`);
  log(`  term: ${term}`);
  log(`  termCode: ${form.termCode}`);
  log(`  fetchedAt: ${fetchedAt}`);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
});
