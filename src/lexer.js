// A small lexer for Java and Kotlin source files. It reads the text once, left to right, and keeps only what the checks
// need: names, string literals with their text, and single punctuation characters. Comments are dropped, so a javax
// name in a comment or in Javadoc is never reported. It knows the forms that could hide the end of a comment or a
// string: escapes, character literals, Java text blocks, Kotlin raw strings in triple quotes, Kotlin template
// expressions ${...} (whose code is read as code, nested to any depth) and Kotlin comments nested inside comments. A
// string, a character literal or a comment that is not closed stops the run with its line, so a file is never read
// past a place the lexer could not place. It does not parse: the checks in src/sources.js read the tokens.

import { lineStarts, positionOf } from './json.js';

export const LEX_LIMITS = { maxTokens: 4000000, maxTemplateDepth: 64 };

export class LexError extends Error {
  constructor(reason, offset) {
    super(reason);
    this.reason = reason;
    this.offset = offset;
  }
}

export const LANGUAGES = ['java', 'kotlin'];

const isDigit = (c) => c >= 48 && c <= 57;
const isNameStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c >= 0x80;
const isNamePart = (c) => isNameStart(c) || isDigit(c);
const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 13 || c === 12;

// The tokens of a Java or Kotlin source: [{ type: 'name' | 'string' | 'punct', value, offset }]. A string token holds
// the text of its literal parts as written, escapes included; the code of a Kotlin template is read as tokens of its
// own, after the string token it belongs to. Throws LexError with the offset of the problem.
export function tokenize(text, language = 'java', limits = LEX_LIMITS) {
  const lim = { ...LEX_LIMITS, ...limits };
  const kotlin = language === 'kotlin';
  const out = [];
  const n = text.length;
  let i = 0;
  // Kotlin strings interrupted by a template, innermost last: { triple, start, parts, braces }.
  const templates = [];

  const push = (type, value, offset) => {
    if (out.length >= lim.maxTokens) throw new LexError(`more than ${lim.maxTokens} tokens`, offset);
    out.push({ type, value, offset });
  };

  // Reads the body of a string from i, after its opening quotes, up to its end or, in Kotlin, up to a template.
  // Returns true when the string ended.
  const readString = (frame) => {
    for (;;) {
      if (i >= n) throw new LexError(frame.triple ? 'a string in triple quotes that is not closed' : 'a string that is not closed', frame.start);
      const c = text.charCodeAt(i);
      if (frame.triple) {
        if (c === 34 && text.charCodeAt(i + 1) === 34 && text.charCodeAt(i + 2) === 34) {
          // In Kotlin a run of more than three quotes ends with the last three; the others belong to the string.
          let end = i + 3;
          if (kotlin) while (text.charCodeAt(end) === 34) end += 1;
          frame.parts.push(text.slice(frame.from, end - 3));
          i = end;
          return true;
        }
        if (c === 92 && !kotlin) {
          i += 2;
          continue;
        }
      } else {
        if (c === 34) {
          frame.parts.push(text.slice(frame.from, i));
          i += 1;
          return true;
        }
        if (c === 10 || c === 13) throw new LexError('a string that is not closed before the end of its line', frame.start);
        if (c === 92) {
          i += 2;
          continue;
        }
      }
      if (kotlin && c === 36 && text.charCodeAt(i + 1) === 123) {
        frame.parts.push(text.slice(frame.from, i));
        i += 2;
        if (templates.length >= lim.maxTemplateDepth) throw new LexError(`templates nested more than ${lim.maxTemplateDepth} deep`, i - 2);
        frame.braces = 0;
        templates.push(frame);
        return false;
      }
      i += 1;
    }
  };

  const startString = (triple) => {
    const frame = { triple, start: i, parts: [], from: 0, braces: 0 };
    i += triple ? 3 : 1;
    frame.from = i;
    if (readString(frame)) push('string', frame.parts.join(''), frame.start);
  };

  while (i < n) {
    const c = text.charCodeAt(i);
    if (isSpace(c)) {
      i += 1;
      continue;
    }
    if (c === 47 && text.charCodeAt(i + 1) === 47) {
      while (i < n && text.charCodeAt(i) !== 10 && text.charCodeAt(i) !== 13) i += 1;
      continue;
    }
    if (c === 47 && text.charCodeAt(i + 1) === 42) {
      // Java ends a comment at the first */; Kotlin counts the comments opened inside it.
      const start = i;
      let depth = 1;
      i += 2;
      while (depth > 0) {
        if (i >= n) throw new LexError('a comment that is not closed', start);
        if (text.charCodeAt(i) === 42 && text.charCodeAt(i + 1) === 47) {
          depth -= 1;
          i += 2;
        } else if (kotlin && text.charCodeAt(i) === 47 && text.charCodeAt(i + 1) === 42) {
          depth += 1;
          i += 2;
        } else i += 1;
      }
      continue;
    }
    if (c === 34) {
      startString(text.charCodeAt(i + 1) === 34 && text.charCodeAt(i + 2) === 34);
      continue;
    }
    if (c === 39) {
      const start = i;
      i += 1;
      for (;;) {
        if (i >= n || text.charCodeAt(i) === 10 || text.charCodeAt(i) === 13) throw new LexError('a character literal that is not closed', start);
        const d = text.charCodeAt(i);
        if (d === 92) i += 2;
        else if (d === 39) {
          i += 1;
          break;
        } else i += 1;
      }
      continue;
    }
    if (kotlin && c === 96) {
      const start = i;
      const end = text.indexOf('`', i + 1);
      const line = text.slice(i + 1, end < 0 ? n : end);
      if (end < 0 || line.includes('\n') || line.includes('\r')) throw new LexError('a name in backticks that is not closed', start);
      push('name', line, start);
      i = end + 1;
      continue;
    }
    if (isNameStart(c)) {
      const start = i;
      while (i < n && isNamePart(text.charCodeAt(i))) i += 1;
      push('name', text.slice(start, i), start);
      continue;
    }
    if (isDigit(c)) {
      // A number: digits, letters, underscores and a dot followed by a digit. It is not a name and is not kept.
      while (i < n && (isNamePart(text.charCodeAt(i)) || (text.charCodeAt(i) === 46 && isDigit(text.charCodeAt(i + 1))))) i += 1;
      continue;
    }
    if (templates.length && c === 123) templates.at(-1).braces += 1;
    if (templates.length && c === 125) {
      const frame = templates.at(-1);
      if (frame.braces === 0) {
        // The end of a template: back to the string it interrupted.
        templates.pop();
        i += 1;
        frame.from = i;
        if (readString(frame)) push('string', frame.parts.join(''), frame.start);
        continue;
      }
      frame.braces -= 1;
    }
    push('punct', text[i], i);
    i += 1;
  }
  if (templates.length) throw new LexError('a template ${ that is not closed', templates.at(-1).start);
  return out;
}

// The line and column of a LexError, for an error message.
export function lexProblem(error, text) {
  const pos = positionOf(lineStarts(text), Math.min(error.offset, text.length));
  return `line ${pos.line}, column ${pos.column}: ${error.reason}`;
}
