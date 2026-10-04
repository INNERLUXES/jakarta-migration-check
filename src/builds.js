// The dependencies a build file declares, read without running the build. A Maven pom.xml is read as XML: every
// <dependency> element, in <dependencies>, in <dependencyManagement> and in the dependencies of a plugin, with its own
// <groupId> and <artifactId>; an <exclusion> is not a dependency and is never read as one, and a value that holds a
// property such as ${servlet.group} is passed over, because the tool does not resolve properties. A Gradle build in
// the Groovy or the Kotlin DSL and a version catalog in TOML are read line by line: a string "group:artifact" or
// "group:artifact:version", and a group and a name given as named values (group: 'x', name: 'y' or group = "x",
// name = "y", or module = "x:y" in a catalog). A line that excludes or substitutes a dependency is passed over, since
// naming the old artifact there is how a build keeps it out.

import { elementsOf, localName, textOf } from './xml.js';

// The coordinates of a string such as "javax.servlet:javax.servlet-api:4.0.1": { group, artifact }, or null.
export function coordinatesOf(text) {
  const m = /^([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+)(?::[^:\s]*){0,3}$/.exec(text.trim());
  return m ? { group: m[1], artifact: m[2] } : null;
}

// The dependencies of a pom.xml tree: [{ group, artifact, offset }], the offset of the <artifactId> element.
export function mavenDependencies(root) {
  const out = [];
  for (const { element } of elementsOf(root)) {
    if (localName(element.name) !== 'dependency') continue;
    const child = (name) => element.children.find((c) => localName(c.name) === name);
    const g = child('groupId');
    const a = child('artifactId');
    if (!g || !a) continue;
    const group = textOf(g);
    const artifact = textOf(a);
    if (!group || !artifact || group.includes('${') || artifact.includes('${')) continue;
    out.push({ group, artifact, offset: a.offset });
  }
  return out;
}

// The quoted strings of a line of a build file, with the offset of each and the code between them, with comments
// taken out. state.block tells whether a block comment is open at the start of the line; hash says that # starts a
// comment, as in TOML.
function stringsOfLine(line, base, state, hash) {
  const strings = [];
  let code = '';
  let i = 0;
  while (i < line.length) {
    if (state.block) {
      const end = line.indexOf('*/', i);
      if (end < 0) return { strings, code };
      state.block = false;
      i = end + 2;
      continue;
    }
    const c = line[i];
    if (c === '/' && line[i + 1] === '/') break;
    if (hash && c === '#') break;
    if (c === '/' && line[i + 1] === '*') {
      state.block = true;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += line[j] === '\\' ? 2 : 1;
      strings.push({ value: line.slice(i + 1, Math.min(j, line.length)), offset: base + i, before: code });
      code += ' S ';
      i = j + 1;
      continue;
    }
    code += c;
    i += 1;
  }
  return { strings, code };
}

// The dependencies of a Gradle build or a version catalog: [{ group, artifact, offset }]. hash is true for TOML.
export function gradleDependencies(text, hash = false) {
  const out = [];
  const state = { block: false };
  // Each line with its offset; a line ends at LF, CR LF or CR.
  for (const m of text.matchAll(/[^\r\n]+/g)) {
    const { strings, code } = stringsOfLine(m[0], m.index, state, hash);
    if (/\b(?:exclude|substitute|substitution|replacedBy)\b/.test(code)) continue;
    let group = null;
    let name = null;
    for (const s of strings) {
      const key = /\b(group|name|module)\s*[:=]\s*$/.exec(s.before)?.[1] ?? null;
      if (key === 'group') group = s;
      else if (key === 'name') name = s;
      else {
        const c = coordinatesOf(s.value);
        if (c) out.push({ ...c, offset: s.offset });
      }
    }
    if (group && name) out.push({ group: group.value.trim(), artifact: name.value.trim(), offset: group.offset });
  }
  return out;
}
