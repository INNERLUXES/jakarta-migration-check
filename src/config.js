// The configuration file: the settings of the tool, in one strict JSON object over the built-in defaults. A list is
// either a JSON array, which replaces the built-in list, or an object with "replace", "add" and "remove". Every key the
// tool does not know is an error with its line and a suggestion, so a typo cannot leave a default in place unnoticed;
// the JSON reader refuses a name given twice in one object. The configuration is optional: with none, the defaults
// apply.

import { LEVELS } from './data.js';
import { DEFAULT_EXCLUDE, DEFAULT_FILES, DEFAULT_IGNORE, DEFAULT_MIN_SEVERITY, DEFAULT_PACKAGES, DEFAULT_RULES } from './defaults.js';
import { globProblem } from './glob.js';
import { JsonError, jsonProblem, parseJson } from './json.js';
import { JDK, MOVED, MOVED_CLASSES, PARTLY_MOVED } from './mapping.js';
import { asciiLower } from './words.js';

export const CONFIG_LIMITS = { maxEntries: 500, maxEntryLength: 200, maxPackages: 200 };

// Every key of the configuration file, with the kind of its value. docs/inputs.md describes each of them.
export const KEYS = {
  name: 'text',
  files: 'list of file patterns',
  exclude: 'list of file patterns',
  packages: 'object of javax names, each with the jakarta name it moved to',
  ignore: 'list of javax names',
  rules: Object.fromEntries(Object.keys(DEFAULT_RULES).map((k) => [k, 'level or off'])),
  minSeverity: 'level'
};

const LIST_OPS = ['replace', 'add', 'remove'];

// A dotted Java name that starts with a given first part, such as javax.foo.Bar.
const DOTTED = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+$/;
export const isDottedName = (text, first) => typeof text === 'string' && DOTTED.test(text) && text.startsWith(`${first}.`);

export class ConfigError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// The edit distance of two short names, for a suggestion: an insertion, a deletion, a change or two neighbours swapped
// ("nmae" for "name") each count one.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// The closest of the known names, when it is close enough to be a typo: "; did you mean ...?" or nothing. A name longer
// than any known name by more than a few characters is not compared.
export function suggestion(name, known) {
  let best = null;
  for (const k of known) {
    if (Math.abs(name.length - k.length) > 3) continue;
    const d = distance(asciiLower(name), asciiLower(k));
    if (d <= Math.max(1, Math.floor(k.length / 3)) && (!best || d < best.d)) best = { k, d };
  }
  return best ? `; did you mean "${best.k}"?` : '';
}

export function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object') return 'an object';
  return `a ${typeof value}`;
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// The built-in configuration, as the checks use it. packages is a list of { from, to, spec } entries.
export function defaultConfig() {
  return {
    file: null,
    name: null,
    files: [...DEFAULT_FILES],
    exclude: [...DEFAULT_EXCLUDE],
    packages: Object.entries(DEFAULT_PACKAGES).map(([from, to]) => ({ from, to, spec: null })),
    ignore: [...DEFAULT_IGNORE],
    rules: { ...DEFAULT_RULES },
    minSeverity: DEFAULT_MIN_SEVERITY
  };
}

// The built-in configuration written as a configuration file, for --print-defaults. Read back, it gives the defaults.
export function defaultsAsConfig() {
  const d = defaultConfig();
  return { name: 'built-in defaults', files: d.files, exclude: d.exclude, packages: Object.fromEntries(d.packages.map((p) => [p.from, p.to])), ignore: d.ignore, rules: d.rules, minSeverity: d.minSeverity };
}

// The names the mapping already holds, which the packages key may not add again.
const MAPPED = new Set([...MOVED.map((m) => m.from), ...MOVED_CLASSES.map((m) => m.from), ...PARTLY_MOVED.map((p) => p.package), ...JDK.map((j) => j.name)]);

// Checks a parsed configuration and builds the configuration the checks use, or throws ConfigError with every problem.
export function validateConfig(value, lines = new Map(), file = 'config') {
  const problems = [];
  const lineOf = (path) => {
    for (let p = path, prev = null; p && p !== prev; prev = p, p = p.replace(/(?:\.[^.[]+|\[\d+\])$/, '')) if (lines.has(p)) return lines.get(p);
    return 1;
  };
  const fail = (path, message) => problems.push({ line: lineOf(path), text: `${file}: line ${lineOf(path)}: ${message}` });
  const refuse = (path, message, result) => {
    fail(path, message);
    return result;
  };
  const config = defaultConfig();
  config.file = file;
  if (!isObject(value)) throw new ConfigError([`${file}: line 1: the configuration must be a JSON object, not ${kindOf(value)}`]);

  // One entry of a list: a string of 1 to 200 characters, kept in its compared form, or null with a problem.
  const entryOf = (path, e, normalize, hint) => {
    if (typeof e !== 'string') return refuse(path, `${path} must be a text, not ${kindOf(e)}`, null);
    if (e.length === 0 || e.length > CONFIG_LIMITS.maxEntryLength) return refuse(path, `${path} must hold 1 to ${CONFIG_LIMITS.maxEntryLength} characters`, null);
    const n = normalize(e);
    if (n === null) return refuse(path, `${path}: "${e.slice(0, 60)}" is not ${hint}`, null);
    return n;
  };
  const entriesOf = (path, list, normalize, hint) => {
    if (!Array.isArray(list)) return refuse(path, `${path} must be a list, not ${kindOf(list)}`, []);
    if (list.length > CONFIG_LIMITS.maxEntries) return refuse(path, `${path} holds more than ${CONFIG_LIMITS.maxEntries} entries`, []);
    const out = [];
    list.forEach((e, i) => {
      const n = entryOf(`${path}[${i}]`, e, normalize, hint);
      if (n === null) return;
      if (out.includes(n)) fail(`${path}[${i}]`, `${path} names "${n}" twice`);
      else out.push(n);
    });
    return out;
  };
  // A list value: an array that replaces the list, or { replace, add, remove } applied to it in that order.
  const listOf = (path, v, base, normalize, hint = 'a valid entry') => {
    if (Array.isArray(v)) return entriesOf(path, v, normalize, hint);
    if (!isObject(v)) return refuse(path, `${path} must be a list or an object with replace, add or remove, not ${kindOf(v)}`, base);
    for (const k of Object.keys(v)) if (!LIST_OPS.includes(k)) fail(`${path}.${k}`, `"${k.slice(0, 60)}" is not a key of ${path} (replace, add, remove)${suggestion(k, LIST_OPS)}`);
    let out = Object.hasOwn(v, 'replace') ? entriesOf(`${path}.replace`, v.replace, normalize, hint) : [...base];
    if (Object.hasOwn(v, 'remove')) {
      for (const [i, n] of entriesOf(`${path}.remove`, v.remove, normalize, hint).entries()) {
        if (!out.includes(n)) fail(`${path}.remove[${i}]`, `${path}.remove names "${n}", which is not on the list`);
        out = out.filter((x) => x !== n);
      }
    }
    if (Object.hasOwn(v, 'add')) {
      for (const [i, n] of entriesOf(`${path}.add`, v.add, normalize, hint).entries()) {
        if (out.includes(n)) fail(`${path}.add[${i}]`, `${path}.add names "${n}", which is already on the list`);
        else out.push(n);
      }
    }
    if (out.length > CONFIG_LIMITS.maxEntries) fail(path, `${path} holds more than ${CONFIG_LIMITS.maxEntries} entries`);
    return out;
  };

  const top = Object.keys(KEYS);
  for (const k of Object.keys(value)) if (!top.includes(k)) fail(k, `"${k.slice(0, 60)}" is not a key of the configuration${suggestion(k, top)}`);

  if (Object.hasOwn(value, 'name')) {
    if (typeof value.name !== 'string' || value.name.length === 0 || value.name.length > 120) fail('name', 'name must be a text of 1 to 120 characters');
    else config.name = value.name;
  }
  const pattern = (e) => (globProblem(e) === null ? e : null);
  for (const key of ['files', 'exclude']) {
    if (Object.hasOwn(value, key)) config[key] = listOf(key, value[key], config[key], pattern, 'a file pattern: a relative path with / in which only * ? and ** (as a whole part) are special, with no .. and no leading slash');
  }
  if (!config.files.length) fail('files', 'files has no pattern left, so no file of a folder would be read');

  // The moves the configuration adds: each a javax name that the mapping does not hold, with a jakarta name.
  if (Object.hasOwn(value, 'packages')) {
    const v = value.packages;
    if (!isObject(v)) fail('packages', `packages must be an object of javax names, each with its jakarta name, not ${kindOf(v)}`);
    else {
      const names = Object.keys(v);
      if (names.length > CONFIG_LIMITS.maxPackages) fail('packages', `packages names more than ${CONFIG_LIMITS.maxPackages} names`);
      for (const from of names.slice(0, CONFIG_LIMITS.maxPackages)) {
        const path = `packages.${from}`;
        const to = v[from];
        if (!isDottedName(from, 'javax') || from.length > CONFIG_LIMITS.maxEntryLength) fail(path, `"${from.slice(0, 60)}" is not a javax name such as javax.example.api`);
        else if (MAPPED.has(from)) fail(path, `${from} is in the mapping already (src/mapping.js); packages only adds names the mapping does not hold`);
        else if (!isDottedName(to, 'jakarta') || to.length > CONFIG_LIMITS.maxEntryLength) fail(path, `${path} must be a jakarta name such as jakarta.example.api, not ${typeof to === 'string' ? `"${to.slice(0, 60)}"` : kindOf(to)}`);
        else config.packages.push({ from, to, spec: null });
      }
    }
  }
  if (Object.hasOwn(value, 'ignore')) config.ignore = listOf('ignore', value.ignore, config.ignore, (e) => (isDottedName(e, 'javax') ? e : null), 'a javax name such as javax.annotation.Resource');

  if (Object.hasOwn(value, 'rules')) {
    const v = value.rules;
    const keys = Object.keys(DEFAULT_RULES);
    if (!isObject(v)) fail('rules', `rules must be an object, not ${kindOf(v)}`);
    else {
      for (const k of Object.keys(v)) {
        const path = `rules.${k}`;
        if (!keys.includes(k)) fail(path, `"${k.slice(0, 60)}" is not a key of rules${suggestion(k, keys)}`);
        else if (typeof v[k] !== 'string' || ![...LEVELS, 'off'].includes(v[k])) fail(path, `${path} must be one of ${[...LEVELS, 'off'].join(', ')}, not ${typeof v[k] === 'string' ? `"${v[k].slice(0, 40)}"` : kindOf(v[k])}`);
        else config.rules[k] = v[k];
      }
    }
  }
  if (Object.hasOwn(value, 'minSeverity')) {
    if (!LEVELS.includes(value.minSeverity)) fail('minSeverity', `minSeverity must be one of ${LEVELS.join(', ')}`);
    else config.minSeverity = value.minSeverity;
  }
  // The problems in the order of their lines, so the list reads like the file.
  if (problems.length) throw new ConfigError(problems.sort((a, b) => a.line - b.line).map((p) => p.text));
  return config;
}

// Reads the text of a configuration file.
export function readConfig(text, file) {
  let parsed;
  try {
    parsed = parseJson(text, { linesUpTo: 3 });
  } catch (error) {
    if (error instanceof JsonError) throw new ConfigError([`${file}: ${jsonProblem(error, text)}`]);
    throw error;
  }
  return validateConfig(parsed.value, parsed.lines, file);
}
