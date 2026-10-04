// A run: read the configuration and the files, run the checks, and build the report of the run. An input that cannot
// be read, a folder with no file to read in it, a file of no kind the tool reads, or a file the readers cannot place (a
// string or a comment that is not closed in a source, an XML tag that is not closed or does not match) stops the run
// with an InputError and no result, so a run never passes because a part of the input was passed over.

import { READ_LIMITS, ReadError, analyse, readInput } from './analyse.js';
import { ConfigError, defaultConfig, readConfig } from './config.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, collectFiles, readText, readTextFile } from './files.js';
import { fileKind } from './kinds.js';
import { spec } from './mapping.js';
import { RULES, atOrAbove, decide } from './rules.js';
import { grouped, plural } from './size.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS, ...READ_LIMITS, maxFindingsPerRule: 500 };
export const MAX_PROBLEMS = 20;

export class InputError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// A copy of a value with every text in it cleaned by safeText, for the parts of the report that come from the input.
export function cleanTexts(value) {
  if (typeof value === 'string') return safeText(value, 300);
  if (Array.isArray(value)) return value.map(cleanTexts);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanTexts(v)]));
  return value;
}

// A list of problems for an error message: the first twenty, then a count.
export function capped(problems) {
  return problems.length > MAX_PROBLEMS ? [...problems.slice(0, MAX_PROBLEMS), `and ${grouped(problems.length - MAX_PROBLEMS)} more`] : problems;
}

// The run as a report object, from the files that were read (src/analyse.js) and the configuration.
export function buildReport({ input, files, config, minSeverity, version, limits = LIMITS }) {
  const { findings: raw, summary } = analyse(files, config);
  const ruleOrder = new Map(RULES.map((r, i) => [r.id, i]));
  const fileOrder = new Map(files.map((f, i) => [f.file, i]));
  const levelOf = (id) => config.rules[RULES.find((r) => r.id === id).key];
  const order = (a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || fileOrder.get(a.file) - fileOrder.get(b.file) || a.line - b.line || a.column - b.column || ruleOrder.get(a.rule) - ruleOrder.get(b.rule);
  const all = raw.filter((f) => levelOf(f.rule) !== 'off').map((f) => ({ ...f, level: levelOf(f.rule) })).sort(order);
  const shown = all.filter((f) => atOrAbove(f.level, minSeverity));
  const hidden = all.length - shown.length;
  const perRule = new Map();
  const findings = [];
  let cut = 0;
  for (const f of shown) {
    const n = (perRule.get(f.rule) ?? 0) + 1;
    perRule.set(f.rule, n);
    if (n > limits.maxFindingsPerRule) cut += 1;
    else {
      const rule = RULES.find((r) => r.id === f.rule);
      const file = safeText(f.file);
      const s = f.spec ? spec(f.spec) : null;
      findings.push({
        rule: f.rule,
        level: f.level,
        file,
        line: f.line,
        column: f.column,
        at: `${file}:${f.line}`,
        found: safeText(f.found, 600),
        from: safeText(f.group, 200),
        to: safeText(f.groupTo, 200),
        spec: s ? { title: s.title, url: s.url } : null,
        basis: rule.basis.map((k) => ({ text: POINTS[k].text, source: pointPage(k).title, url: pointPage(k).url })),
        own: rule.own
      });
    }
  }
  // The result counts every finding at or above the minimum severity, including the ones past the limit of a rule.
  const result = decide(shown);
  const notes = [];
  if (input.skippedLinks) notes.push(`${plural(input.skippedLinks, 'symbolic link')} inside the folders ${input.skippedLinks === 1 ? 'was' : 'were'} skipped, not followed`);
  if (cut) notes.push(`${plural(cut, 'finding')} past the limit of ${grouped(limits.maxFindingsPerRule)} per rule ${cut === 1 ? 'is' : 'are'} counted but not listed`);
  if (hidden) notes.push(`${plural(hidden, 'finding')} below ${minSeverity} ${hidden === 1 ? 'is' : 'are'} not shown`);
  const off = RULES.filter((r) => config.rules[r.key] === 'off');
  if (off.length) notes.push(`${plural(off.length, 'rule')} ${off.length === 1 ? 'is' : 'are'} off: ${off.map((r) => r.id).join(', ')}`);
  const byLevel = { error: 0, warning: 0, notice: 0 };
  for (const f of shown) byLevel[f.level] += 1;
  return {
    tool: 'jakarta-migration-check',
    version,
    input: { paths: input.paths.map((p) => safeText(p)), files: files.map((f) => ({ file: safeText(f.file), kind: f.kind })) },
    config: {
      file: config.file === null ? null : safeText(config.file),
      name: config.name === null ? null : safeText(config.name, 120),
      files: config.files,
      exclude: config.exclude,
      packages: config.packages.map((p) => ({ from: p.from, to: p.to })),
      ignore: config.ignore,
      minSeverity,
      rules: RULES.map((r) => ({ id: r.id, key: r.key, level: config.rules[r.key], rule: safeText(r.rule(config), 600) }))
    },
    summary: cleanTexts(summary),
    findings,
    totals: { findings: shown.length, byLevel, hidden, notListed: cut },
    result,
    notes: notes.map((n) => safeText(n, 600)),
    notice: NOTICE
  };
}

// Reads the configuration and the files named and checks them: the report object of the run.
export async function checkPaths({ inputs, config: configPath = null, minSeverity = null, version = '0.0.0', limits = LIMITS, base = process.cwd() }) {
  let config;
  try {
    if (configPath) {
      const c = await readTextFile(configPath, base, limits.maxConfigBytes);
      config = readConfig(c.text, c.file);
    } else config = defaultConfig();
  } catch (error) {
    if (error instanceof ConfigError) throw new InputError(capped(error.problems));
    throw new InputError([error.message]);
  }
  let collected;
  try {
    collected = await collectFiles(inputs, base, config, limits);
  } catch (error) {
    throw new InputError([error.message]);
  }
  const files = [];
  const problems = [];
  let total = 0;
  for (const { full, shown } of collected.files) {
    try {
      const kind = fileKind(shown);
      if (kind === null) throw new Error(`${shown}: not a kind of file the tool reads (a .java, .kt or .kts source, a pom.xml, a Gradle build, a version catalog, a deployment descriptor of docs/method.md or a file under META-INF/services)`);
      const { text, size } = await readText(full, shown, limits.maxFileBytes);
      total += size;
      if (total > limits.maxTotalBytes) throw new Error(`${shown}: the files read so far hold more than ${grouped(limits.maxTotalBytes)} bytes, the limit of one run`);
      try {
        files.push(readInput(text, shown, kind, limits));
      } catch (error) {
        if (error instanceof ReadError) problems.push(error.message);
        else throw error;
      }
    } catch (error) {
      problems.push(error.message);
      if (/the limit of one run/.test(error.message)) break;
    }
  }
  if (problems.length) throw new InputError(capped(problems));
  return buildReport({ input: { paths: collected.named, skippedLinks: collected.skippedLinks }, files, config, minSeverity: minSeverity ?? config.minSeverity, version, limits });
}
