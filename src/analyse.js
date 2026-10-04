// Reading each file as its kind, and the checks: the javax imports and names of the sources, the javax names in strings,
// descriptor values and service files, the javax artifacts of the builds and the old namespaces of the descriptors.
// Every name is looked up in the mapping of src/mapping.js; a name the mapping does not know, or knows as a package
// of the JDK, is never reported. The rules themselves are described in src/rules.js and docs/method.md.

import { gradleDependencies, mavenDependencies } from './builds.js';
import { lineStarts, positionOf } from './json.js';
import { KINDS } from './kinds.js';
import { LEX_LIMITS, LexError, lexProblem, tokenize } from './lexer.js';
import { ARTIFACTS, JDK, MOVED, MOVED_CLASSES, NAMESPACES, artifactOf, lookupName, namespaceOf, spec, specPackage } from './mapping.js';
import { listText } from './size.js';
import { flat } from './text.js';
import { javaxNamesInText, readSource } from './sources.js';
import { baseName } from './words.js';
import { XML_LIMITS, XmlError, elementsOf, localName, parseXml, xmlProblem } from './xml.js';

export const READ_LIMITS = { ...LEX_LIMITS, ...XML_LIMITS };

// A file that cannot be read as its kind: the message holds the file, the line and the column.
export class ReadError extends Error {}

const specTitle = (id) => spec(id)?.title ?? 'the packages key of the configuration';

// Reads the text of a file as its kind: { file, kind, lines, ...what the checks need }. Throws ReadError.
export function readInput(text, file, kind, limits = READ_LIMITS) {
  const starts = lineStarts(text);
  const at = (offset) => positionOf(starts, offset);
  const base = { file, kind, at };
  try {
    if (kind === 'java' || kind === 'kotlin') {
      const tokens = tokenize(text, kind, limits);
      return { ...base, source: readSource(tokens, kind, (offset) => at(offset).line) };
    }
    if (kind === 'maven') return { ...base, dependencies: mavenDependencies(parseXml(text, limits)) };
    if (kind === 'gradle' || kind === 'catalog') return { ...base, dependencies: gradleDependencies(text, kind === 'catalog') };
    if (kind === 'descriptor') return { ...base, root: parseXml(text, limits) };
    if (kind === 'service') {
      // One provider per line, ended by LF, CR LF or CR; # starts a comment; spaces around a name are dropped.
      const lines = [];
      for (const m of text.matchAll(/[^\r\n]+/g)) {
        const name = m[0].split('#')[0].trim();
        if (name) lines.push({ name, offset: m.index + m[0].indexOf(name) });
      }
      return { ...base, lines };
    }
  } catch (error) {
    if (error instanceof LexError) throw new ReadError(`${file}: ${lexProblem(error, text)}`);
    if (error instanceof XmlError) throw new ReadError(`${file}: ${xmlProblem(error, text)}`);
    throw error;
  }
  throw new ReadError(`${file}: not a kind of file the tool reads`);
}

// The checks of every file read: { findings, summary }. Each finding is { rule, file, line, column, found, group,
// groupTo, spec } before the report gives it a level.
export function analyse(files, config) {
  const findings = [];
  const options = { extra: config.packages, ignore: config.ignore };
  const counts = { files: files.length, byKind: Object.fromEntries(KINDS.map((k) => [k, 0])), imports: 0, dependencies: 0, descriptors: 0, services: 0 };
  // The javax names seen, by where they were found and what the mapping says of them.
  const seen = { imports: { moved: 0, partly: 0, jdk: 0, ignored: 0, unknown: 0 }, code: { moved: 0, partly: 0, jdk: 0, ignored: 0, unknown: 0 }, texts: { moved: 0, partly: 0, jdk: 0, ignored: 0, unknown: 0 } };
  let artifactsFound = 0;
  let oldNamespaces = 0;

  const add = (f, rule, offset, found, group, groupTo, specId) => {
    const pos = f.at(offset);
    findings.push({ rule, file: f.file, line: pos.line, column: pos.column, found, group, groupTo, spec: specId });
  };
  const movedText = (r) => `${r.replacement} (${specTitle(r.spec)})`;
  // A javax name inside a text: a finding of the given rule when the name moved.
  const textName = (f, rule, name, offset, describe) => {
    const r = lookupName(name, options);
    seen.texts[r.kind] += 1;
    if (r.kind !== 'moved') return;
    add(f, rule, offset, `${describe} names ${name}, which moved to ${movedText(r)}; a class name read by reflection, a property name or a key must change with it`, r.group, r.groupTo, r.spec);
  };

  for (const f of files) {
    counts.byKind[f.kind] += 1;
    if (f.source) {
      const { imports, names, texts } = f.source;
      counts.imports += imports.length;
      for (const imp of imports) {
        const r = lookupName(imp.name, options);
        if (r.kind === 'unknown' && !imp.name.startsWith('javax.')) continue;
        seen.imports[r.kind] += 1;
        const shown = `import ${imp.isStatic ? 'static ' : ''}${imp.name}${imp.wildcard ? '.*' : ''}`;
        if (r.kind === 'moved') add(f, 'javax-import', imp.offset, `${shown}: moved to ${r.replacement}${imp.wildcard ? '.*' : ''} (${specTitle(r.spec)})`, r.group, r.groupTo, r.spec);
        else if (r.kind === 'partly' && imp.name === r.package && imp.wildcard) {
          add(f, 'partly-moved-import', imp.offset, `${shown}: only ${r.classes.length} classes of ${r.package} moved, ${listText(r.classes, 3)}, to ${r.to} (${specTitle(r.spec)}); the other names of ${r.package} belong to other libraries and stay, so import the ones this file uses by name`, r.package, r.to, r.spec);
        }
      }
      for (const n of names) {
        const r = lookupName(n.name, options);
        seen.code[r.kind] += 1;
        if (r.kind === 'moved') add(f, 'javax-qualified-name', n.offset, `${n.name} is written out in full: moved to ${movedText(r)}`, r.group, r.groupTo, r.spec);
      }
      for (const t of texts) {
        // The text of a string as one line, so the message is the same whatever the line ends of the file.
        const one = flat(t.value);
        textName(f, 'javax-name-in-text', t.name, t.offset, `the string "${one.length > 120 ? `${one.slice(0, 117)}...` : one}"`);
      }
    }
    if (f.dependencies) {
      counts.dependencies += f.dependencies.length;
      for (const d of f.dependencies) {
        const a = artifactOf(d.group, d.artifact);
        if (!a) continue;
        artifactsFound += 1;
        const p = specPackage(a.spec);
        add(f, 'javax-artifact', d.offset, `${a.from} is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name ${a.to} (${specTitle(a.spec)})`, p.from, p.to, a.spec);
      }
    }
    if (f.root) {
      counts.descriptors += 1;
      let old = false;
      for (const { element } of elementsOf(f.root)) {
        for (const attr of element.attributes) {
          if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
            const ns = namespaceOf(attr.value);
            if (ns) {
              old = true;
              add(f, 'old-descriptor-namespace', attr.offset, `${attr.name}="${attr.value.trim()}" is a namespace of the descriptors before Jakarta EE 9; Jakarta EE 9 and later use ${ns.to}, with the schema location and the version that go with it`, ns.from, ns.to, null);
            }
            continue;
          }
          if (localName(attr.name) === 'schemaLocation' || localName(attr.name) === 'noNamespaceSchemaLocation') continue;
          for (const m of javaxNamesInText(attr.value)) textName(f, 'javax-name-in-text', m.name, attr.offset, `the attribute ${attr.name}="${flat(attr.value).slice(0, 120)}" of <${element.name}>`);
        }
        for (const t of element.texts) {
          const value = t.value.trim();
          for (const m of javaxNamesInText(t.value)) textName(f, 'javax-name-in-text', m.name, t.offset + t.value.indexOf(value), `the value "${flat(value).slice(0, 120)}" of <${element.name}>`);
        }
      }
      if (old) oldNamespaces += 1;
    }
    if (f.lines) {
      counts.services += 1;
      const service = baseName(f.file);
      const r = lookupName(service, options);
      if (r.kind === 'moved') add(f, 'javax-service-file', 0, `the service file is named for ${service}, which moved to ${movedText(r)}; ServiceLoader looks the providers up under the new name, so this file must be renamed to ${r.replacement}`, r.group, r.groupTo, r.spec);
      for (const l of f.lines) {
        const p = lookupName(l.name, options);
        if (p.kind === 'moved') add(f, 'javax-service-file', l.offset, `the provider ${l.name} moved to ${movedText(p)}`, p.group, p.groupTo, p.spec);
      }
    }
  }

  // The findings per javax package, or per old namespace, most findings first.
  const groups = new Map();
  for (const x of findings) {
    const g = groups.get(x.group) ?? { from: x.group, to: x.groupTo, findings: 0, files: new Set(), rules: new Map() };
    g.findings += 1;
    g.files.add(x.file);
    g.rules.set(x.rule, (g.rules.get(x.rule) ?? 0) + 1);
    groups.set(x.group, g);
  }
  const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const packages = [...groups.values()].sort((a, b) => b.findings - a.findings || byCode(a.from, b.from)).map((g) => ({ from: g.from, to: g.to, findings: g.findings, files: g.files.size, rules: Object.fromEntries(g.rules) }));
  const mapping = { moved: MOVED.length, movedClasses: MOVED_CLASSES.length, jdk: JDK.length, artifacts: ARTIFACTS.length, namespaces: NAMESPACES.length, extra: config.packages.length, ignored: config.ignore.length };
  return { findings, summary: { counts, seen, artifacts: artifactsFound, oldNamespaces, packages, mapping } };
}
