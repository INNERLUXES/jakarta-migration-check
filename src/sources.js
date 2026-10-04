// The javax names of a Java or Kotlin source, from its tokens (src/lexer.js): the imports, the fully qualified names
// written in the code, and the javax names inside string literals. A package declaration is passed over, a name that
// follows a dot is part of a longer name (so a.javax.b is not javax.b), and the names in comments never reach this
// file, because the lexer drops comments.

// A javax name inside a text: javax followed by a dot or a slash and at least one more part, and not preceded by a
// part of a longer name. A name with slashes, as a resource path writes it, is read with dots.
const TEXT_NAME = /(?<![A-Za-z0-9_$./])javax[./][A-Za-z_$][A-Za-z0-9_$]*(?:[./][A-Za-z_$][A-Za-z0-9_$]*)*/g;

// The javax names inside a text: [{ name, index }], with dots for slashes.
export function javaxNamesInText(text) {
  const out = [];
  for (const m of String(text).matchAll(TEXT_NAME)) out.push({ name: m[0].replace(/\//g, '.'), index: m.index });
  return out;
}

const isPunct = (t, v) => t && t.type === 'punct' && t.value === v;
const isName = (t) => t && t.type === 'name';

// Reads a dotted name from tokens[k]: { name, next, wildcard }, where next is the index after it. A name ends where
// a dot is not followed by a name, or at .* when wildcard is allowed.
function dotted(tokens, k, wildcard = false) {
  const parts = [tokens[k].value];
  let j = k + 1;
  let star = false;
  while (isPunct(tokens[j], '.')) {
    if (isName(tokens[j + 1])) {
      parts.push(tokens[j + 1].value);
      j += 2;
    } else if (wildcard && isPunct(tokens[j + 1], '*')) {
      star = true;
      j += 2;
      break;
    } else break;
  }
  return { name: parts.join('.'), next: j, wildcard: star };
}

// The javax names of a source: { imports: [{ name, wildcard, isStatic, offset }], names: [{ name, offset }], texts:
// [{ name, value, offset }] }. lineOf gives the line of an offset; in Kotlin an import or a package declaration starts
// a line, since neither is a keyword there in every place.
export function readSource(tokens, language, lineOf) {
  const imports = [];
  const names = [];
  const texts = [];
  const kotlin = language === 'kotlin';
  // In Kotlin, a declaration starts a line; in Java, it follows nothing, a semicolon, or a closing brace.
  const startsStatement = (k) => {
    const prev = tokens[k - 1];
    if (!prev) return true;
    if (kotlin) return lineOf(prev.offset) < lineOf(tokens[k].offset) || isPunct(prev, ';');
    return isPunct(prev, ';') || isPunct(prev, '}');
  };
  for (let k = 0; k < tokens.length; k += 1) {
    const t = tokens[k];
    if (t.type === 'string') {
      for (const found of javaxNamesInText(t.value)) texts.push({ name: found.name, value: t.value, offset: t.offset });
      continue;
    }
    if (t.type !== 'name') continue;
    if ((t.value === 'import' || t.value === 'package') && isName(tokens[k + 1]) && startsStatement(k)) {
      let j = k + 1;
      const isStatic = !kotlin && t.value === 'import' && tokens[j].value === 'static' && isName(tokens[j + 1]);
      if (isStatic) j += 1;
      const d = dotted(tokens, j, t.value === 'import');
      if (t.value === 'import') imports.push({ name: d.name, wildcard: d.wildcard, isStatic, offset: tokens[j].offset });
      k = d.next - 1;
      continue;
    }
    if (t.value === 'javax' && !isPunct(tokens[k - 1], '.') && isPunct(tokens[k + 1], '.') && isName(tokens[k + 2])) {
      const d = dotted(tokens, k);
      names.push({ name: d.name, offset: t.offset });
      k = d.next - 1;
    }
  }
  return { imports, names, texts };
}
