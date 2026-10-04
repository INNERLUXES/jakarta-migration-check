// The reports: text for a terminal, JSON for other tools, and GitHub workflow commands that turn each finding into an
// annotation on the file, line and column. Every text from the input (a file name, a name, a string, a value) was
// cleaned by safeText before it reached the report object. The GitHub commands also escape the characters a command
// gives a meaning to, so a text in the input cannot end a command early or start another one.

import { KINDS } from './kinds.js';
import { grouped, plural } from './size.js';
import { safeText } from './text.js';

const clean = (t, max = 200) => safeText(t, max);
const pathsText = (r) => r.input.paths.join(', ');

function kindsText(r) {
  const n = r.summary.counts.byKind;
  return KINDS.filter((k) => n[k]).map((k) => `${grouped(n[k])} ${k}`).join(', ');
}

function inputLine(r) {
  const kinds = kindsText(r);
  return `${pathsText(r)} (${plural(r.summary.counts.files, 'file')}${kinds ? `: ${kinds}` : ''})`;
}

function configLine(r) {
  const c = r.config;
  const where = c.file ? `${c.file}${c.name ? ` (${clean(c.name, 120)})` : ''}` : 'built-in defaults';
  const extra = c.packages.length ? plural(c.packages.length, 'added move') : 'no added moves';
  const ignore = c.ignore.length ? plural(c.ignore.length, 'ignored name') : 'no ignored names';
  return `${where}: ${plural(c.files.length, 'file pattern')}, ${plural(c.exclude.length, 'exclude pattern')}, ${extra}, ${ignore}; minimum severity ${c.minSeverity}`;
}

const rulesLine = (r) => r.config.rules.map((x) => `${x.id} (${x.level})`).join('; ');

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'notice'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

// The javax names of one place, by what the mapping says of them.
function seenText(s) {
  const parts = [['moved', 'moved'], ['partly', 'of javax.annotation, not moved'], ['jdk', 'in the JDK'], ['ignored', 'ignored'], ['unknown', 'not in the mapping']].filter(([k]) => s[k]).map(([k, label]) => `${grouped(s[k])} ${label}`);
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  return `${grouped(total)}${parts.length ? `: ${parts.join(', ')}` : ''}`;
}

// The lines that say what was read.
function summaryLines(r) {
  const s = r.summary;
  const c = s.counts;
  const m = s.mapping;
  const rows = [];
  rows.push(['files', `${grouped(c.files)}${kindsText(r) ? `: ${kindsText(r)}` : ''}`]);
  rows.push(['imports', `${grouped(c.imports)} read; javax imports ${seenText(s.seen.imports)}`]);
  rows.push(['code names', `javax names written out in full ${seenText(s.seen.code)}`]);
  rows.push(['texts', `javax names in strings and descriptor values ${seenText(s.seen.texts)}`]);
  rows.push(['dependencies', `${grouped(c.dependencies)} read; ${plural(s.artifacts, 'Java EE artifact')}`]);
  rows.push(['descriptors', `${grouped(c.descriptors)} read; ${grouped(s.oldNamespaces)} with a namespace of Java EE`]);
  rows.push(['service files', `${grouped(c.services)} read`]);
  rows.push(['mapping', `${grouped(m.moved)} moved prefixes, ${grouped(m.movedClasses)} moved classes, ${grouped(m.jdk)} JDK prefixes, ${grouped(m.artifacts)} artifacts, ${grouped(m.namespaces)} namespaces; ${grouped(m.extra)} added and ${grouped(m.ignored)} ignored by the configuration`]);
  const width = Math.max(...rows.map((x) => x[0].length));
  return rows.map(([k, v]) => `  ${k.padEnd(width)}  ${v}`);
}

// A table with a header row and its columns padded to the widest cell.
function table(head, rows) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => `  ${cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ')}`;
  return [line(head), ...rows.map(line)];
}

// The findings per javax package (or old namespace), for --summary.
function packageLines(r) {
  if (!r.summary.packages.length) return ['  none'];
  const rows = r.summary.packages.map((p) => [p.from, p.to, grouped(p.findings), grouped(p.files), Object.entries(p.rules).map(([k, v]) => `${k} ${grouped(v)}`).join(', ')]);
  return table(['from', 'to', 'findings', 'files', 'rules'], rows);
}

export function toText(r, { explain = false, summary = false } = {}) {
  const out = [];
  out.push(`jakarta-migration-check: ${pathsText(r)}`);
  out.push(`input: ${inputLine(r)}`);
  out.push(`config: ${configLine(r)}`);
  out.push(`rules: ${rulesLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...r.config.rules.map((x) => x.id.length));
  const pad = ' '.repeat(11);
  for (const f of r.findings) {
    out.push(`  ${f.level.toUpperCase().padEnd(8)} ${f.rule.padEnd(width)}  ${f.at}`);
    out.push(`${pad}${f.found}`);
    if (explain) {
      out.push(`${pad}rule: ${r.config.rules.find((x) => x.id === f.rule).rule}`);
      if (f.spec) out.push(`${pad}specification: ${f.spec.title}, ${f.spec.url}`);
      for (const b of f.basis) out.push(`${pad}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${pad}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  if (summary) out.push('Per package', '', ...packageLines(r), '');
  out.push(`Read: ${pathsText(r)}`, '');
  out.push(...summaryLines(r), '');
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

// The message of a workflow command: %, CR and LF escaped.
export const escapeData = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

// A property of a workflow command: also : and , escaped.
export const escapeProperty = (t) => escapeData(t).replace(/:/g, '%3A').replace(/,/g, '%2C');

const COMMANDS = { error: 'error', warning: 'warning', notice: 'notice' };

export function toGithub(r) {
  const out = [];
  for (const f of r.findings) {
    const props = [`file=${escapeProperty(f.file)}`, `line=${f.line}`, ...(f.column ? [`col=${f.column}`] : []), `title=${escapeProperty(`jakarta-migration-check ${f.rule}`)}`];
    out.push(`::${COMMANDS[f.level]} ${props.join(',')}::${escapeData(f.found)}`);
  }
  out.push(`jakarta-migration-check: ${pathsText(r)}: ${plural(r.summary.counts.files, 'file')}, ${grouped(r.totals.findings)} ${r.totals.findings === 1 ? 'finding' : 'findings'}; RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}
