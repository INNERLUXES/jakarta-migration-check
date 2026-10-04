// A small XML reader for pom.xml and the deployment descriptors. It reads the text once, left to right, and builds a
// tree of elements with their attributes, their text and the offset of each, which is all the checks need. It skips
// the XML declaration, processing instructions, comments and the document type declaration, and it never reads or
// expands a declared entity: only the five entities of XML and character references are decoded, and any other entity
// is left as it is written. It fetches nothing, so a DOCTYPE that names an external file is only text. A tag that is
// not closed, an end tag that does not match, an attribute without quotes or an attribute named twice stops the run
// with its line, so a file is never judged on a part the reader could not place.

import { lineStarts, positionOf } from './json.js';

export const XML_LIMITS = { maxDepth: 256, maxElements: 1000000, maxAttributes: 256 };

export class XmlError extends Error {
  constructor(reason, offset) {
    super(reason);
    this.reason = reason;
    this.offset = offset;
  }
}

const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 13;
const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

// Text with the five entities of XML and character references decoded; any other entity is kept as written.
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z]{2,4});/g, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return Object.hasOwn(ENTITIES, name) ? ENTITIES[name] : whole;
  });
}

// The name of an element or attribute without its prefix: "xsi:schemaLocation" is "schemaLocation".
export const localName = (name) => name.slice(name.indexOf(':') + 1);

// Reads one XML document. Returns the root element: { name, offset, attributes: [{ name, value, offset }], children,
// texts: [{ value, offset }] }. Throws XmlError with the offset of the problem.
export function parseXml(text, limits = XML_LIMITS) {
  const lim = { ...XML_LIMITS, ...limits };
  const n = text.length;
  let i = 0;
  let root = null;
  let elements = 0;
  const stack = [];
  const fail = (reason, at = i) => {
    throw new XmlError(reason, at);
  };
  const skipTo = (end, what) => {
    const at = text.indexOf(end, i);
    if (at < 0) fail(`${what} that is not closed`);
    i = at + end.length;
  };
  const readName = () => {
    const start = i;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (isSpace(c) || c === 47 || c === 62 || c === 61 || c === 60 || c === 34 || c === 39) break;
      i += 1;
    }
    if (i === start) fail('a name was expected');
    return text.slice(start, i);
  };
  const skipSpace = () => {
    while (i < n && isSpace(text.charCodeAt(i))) i += 1;
  };

  while (i < n) {
    if (text.charCodeAt(i) !== 60) {
      const start = i;
      const at = text.indexOf('<', i);
      i = at < 0 ? n : at;
      const raw = text.slice(start, i);
      if (stack.length) stack.at(-1).texts.push({ value: decodeEntities(raw), offset: start });
      else if (raw.trim()) fail('text outside the root element', start);
      continue;
    }
    const start = i;
    if (text.startsWith('<!--', i)) {
      skipTo('-->', 'a comment');
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      if (!stack.length) fail('a CDATA section outside the root element');
      i += 9;
      const at = text.indexOf(']]>', i);
      if (at < 0) fail('a CDATA section that is not closed', start);
      stack.at(-1).texts.push({ value: text.slice(i, at), offset: i });
      i = at + 3;
      continue;
    }
    if (text.startsWith('<?', i)) {
      skipTo('?>', 'a processing instruction');
      continue;
    }
    if (text.startsWith('<!', i)) {
      // A document type declaration: skipped up to its end, past any quoted text and an internal subset in brackets.
      i += 2;
      let bracket = 0;
      for (;;) {
        if (i >= n) fail('a declaration that is not closed', start);
        const c = text[i];
        if (c === '"' || c === "'") {
          const at = text.indexOf(c, i + 1);
          if (at < 0) fail('a quoted value that is not closed', i);
          i = at + 1;
          continue;
        }
        if (c === '[') bracket += 1;
        else if (c === ']') bracket -= 1;
        else if (c === '>' && bracket <= 0) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (text.startsWith('</', i)) {
      i += 2;
      const name = readName();
      skipSpace();
      if (text[i] !== '>') fail('an end tag that is not closed', start);
      i += 1;
      const open = stack.pop();
      if (!open) fail(`an end tag </${name.slice(0, 60)}> with no element open`, start);
      if (open.name !== name) fail(`the end tag </${name.slice(0, 60)}> does not match <${open.name.slice(0, 60)}>`, start);
      continue;
    }
    i += 1;
    const element = { name: readName(), offset: start, attributes: [], children: [], texts: [] };
    elements += 1;
    if (elements > lim.maxElements) fail(`more than ${lim.maxElements} elements`, start);
    for (;;) {
      skipSpace();
      if (i >= n) fail('a tag that is not closed', start);
      if (text[i] === '/' && text[i + 1] === '>') {
        i += 2;
        element.empty = true;
        break;
      }
      if (text[i] === '>') {
        i += 1;
        break;
      }
      const at = i;
      const name = readName();
      skipSpace();
      if (text[i] !== '=') fail(`the attribute ${name.slice(0, 60)} has no value`, at);
      i += 1;
      skipSpace();
      const q = text[i];
      if (q !== '"' && q !== "'") fail(`the value of the attribute ${name.slice(0, 60)} is not in quotes`, at);
      const end = text.indexOf(q, i + 1);
      if (end < 0) fail(`the value of the attribute ${name.slice(0, 60)} is not closed`, at);
      if (element.attributes.some((a) => a.name === name)) fail(`the attribute ${name.slice(0, 60)} appears twice in one tag`, at);
      if (element.attributes.length >= lim.maxAttributes) fail(`more than ${lim.maxAttributes} attributes in one tag`, at);
      element.attributes.push({ name, value: decodeEntities(text.slice(i + 1, end)), offset: at });
      i = end + 1;
    }
    if (stack.length) stack.at(-1).children.push(element);
    else if (root) fail('a second root element', start);
    else root = element;
    if (!element.empty) {
      if (stack.length >= lim.maxDepth) fail(`elements nested more than ${lim.maxDepth} deep`, start);
      stack.push(element);
    }
  }
  if (stack.length) fail(`the element <${stack.at(-1).name.slice(0, 60)}> is not closed`, stack.at(-1).offset);
  if (!root) fail('no root element', 0);
  return root;
}

// Every element of a tree, the root first, each with its parent: [{ element, parent }]. Walked without recursion.
export function elementsOf(root) {
  const out = [];
  const todo = [{ element: root, parent: null }];
  while (todo.length) {
    const item = todo.pop();
    out.push(item);
    for (let k = item.element.children.length - 1; k >= 0; k -= 1) todo.push({ element: item.element.children[k], parent: item.element });
  }
  return out;
}

// The text of an element: its text parts joined and trimmed.
export const textOf = (element) => element.texts.map((t) => t.value).join('').trim();

// The line and column of an XmlError, for an error message.
export function xmlProblem(error, text) {
  const pos = positionOf(lineStarts(text), Math.min(error.offset, text.length));
  return `line ${pos.line}, column ${pos.column}: ${error.reason}`;
}
