import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, LexError, lexProblem, tokenize } from '../src/index.js';

// The lexer: names, strings and punctuation of Java and Kotlin, with every form that could hide the end of a comment
// or a string, and every form left open refused with its place.

const names = (text, language) => tokenize(text, language).filter((t) => t.type === 'name').map((t) => t.value);
const strings = (text, language) => tokenize(text, language).filter((t) => t.type === 'string').map((t) => t.value);
const fails = (text, language, pattern) => assert.throws(() => tokenize(text, language), (e) => e instanceof LexError && pattern.test(e.reason), text.slice(0, 60));

test('lexer: the two languages', () => {
  assert.deepEqual(LANGUAGES, ['java', 'kotlin']);
});

test('lexer: names, dots and punctuation, with numbers left out', () => {
  const tokens = tokenize('a.b(1, 2.5e3, 0x1F_FF); x$y _z');
  assert.deepEqual(tokens.map((t) => `${t.type}:${t.value}`), ['name:a', 'punct:.', 'name:b', 'punct:(', 'punct:,', 'punct:,', 'punct:)', 'punct:;', 'name:x$y', 'name:_z']);
  assert.equal(tokens[2].offset, 2);
});

test('lexer: line and block comments are dropped, in both languages', () => {
  assert.deepEqual(names('a // javax.servlet.X\nb /* javax.persistence.Y */ c'), ['a', 'b', 'c']);
  assert.deepEqual(names('/** {@link javax.ws.rs.GET} */ d', 'kotlin'), ['d']);
});

test('lexer: Java ends a block comment at the first */, Kotlin counts the comments nested in it', () => {
  assert.deepEqual(names('/* a /* b */ c */'), ['c']);
  assert.deepEqual(names('/* a /* b */ c */ d', 'kotlin'), ['d']);
  fails('/* a /* b */ c', 'kotlin', /a comment that is not closed/);
});

test('lexer: strings keep their text with escapes as written, and an escaped quote does not end them', () => {
  assert.deepEqual(strings('x = "javax.servlet.Filter"; y = "a\\"b"; z = ""'), ['javax.servlet.Filter', 'a\\"b', '']);
  assert.deepEqual(names('"// not a comment" n'), ['n']);
  assert.deepEqual(names('"/* not a comment" n'), ['n']);
});

test('lexer: character literals, including a quote and a backslash', () => {
  assert.deepEqual(names("char a = '\"'; char b = '\\''; char c = '\\\\'; d"), ['char', 'a', 'char', 'b', 'char', 'c', 'd']);
});

test('lexer: a Java text block runs over lines and ends at three quotes, past an escaped quote', () => {
  const text = 'String s = """\n  javax.persistence.Entity\n  a \\""" b\n  """; t';
  assert.deepEqual(strings(text), ['\n  javax.persistence.Entity\n  a \\""" b\n  ']);
  assert.deepEqual(names(text), ['String', 's', 't']);
});

test('lexer: a Kotlin raw string has no escapes, and a run of more than three quotes ends with the last three', () => {
  assert.deepEqual(strings('val a = """x\\"""', 'kotlin'), ['x\\']);
  assert.deepEqual(strings('val b = """say ""hi"""""', 'kotlin'), ['say ""hi""']);
});

test('lexer: a Kotlin template is code, nested to any depth, and its string is kept whole', () => {
  const tokens = tokenize('val s = "a ${javax.ws.rs.core.MediaType.TEXT_PLAIN} b ${f("in ${x} }")} c"', 'kotlin');
  assert.deepEqual(tokens.filter((t) => t.type === 'string').map((t) => t.value), ['in  }', 'a  b  c']);
  assert.ok(tokens.some((t) => t.type === 'name' && t.value === 'javax'));
  assert.deepEqual(strings('val r = """x ${ mapOf(1 to 2).size } y"""', 'kotlin'), ['x  y']);
  assert.deepEqual(strings('val d = "price: $amount"', 'kotlin'), ['price: $amount'], 'a template without braces stays text');
  assert.deepEqual(strings('String j = "${not.a.template}";'), ['${not.a.template}'], 'Java has no templates');
});

test('lexer: a brace inside a template is counted, so only the closing brace of the template ends it', () => {
  assert.deepEqual(strings('val s = "${listOf(1).map { it + 1 }}!"', 'kotlin'), ['!']);
});

test('lexer: Kotlin names in backticks', () => {
  assert.deepEqual(names('fun `a test`() = `when`', 'kotlin'), ['fun', 'a test', 'when']);
  fails('val `x = 1\n', 'kotlin', /a name in backticks that is not closed/);
});

test('lexer: a name may hold letters past ASCII', () => {
  assert.deepEqual(names(`int caf${String.fromCharCode(0xe9)} = 1;`), ['int', `caf${String.fromCharCode(0xe9)}`]);
});

for (const [name, text, language, pattern] of [
  ['a string at the end of the text', 'a = "abc', 'java', /a string that is not closed/],
  ['a string over a line end', 'a = "abc\nb";', 'java', /not closed before the end of its line/],
  ['a Kotlin string over a line end', 'val a = "abc\r\n"', 'kotlin', /not closed before the end of its line/],
  ['a text block', 's = """\nabc', 'java', /a string in triple quotes that is not closed/],
  ['a raw string', 'val s = """abc', 'kotlin', /a string in triple quotes that is not closed/],
  ['a character literal', "c = 'a", 'java', /a character literal that is not closed/],
  ['a character literal over a line end', "c = 'a\n'", 'java', /a character literal that is not closed/],
  ['a block comment', 'a /* b', 'java', /a comment that is not closed/],
  ['a template', 'val s = "${x', 'kotlin', /a string that is not closed|a template/],
  ['a template that holds an open brace', 'val s = "${ {', 'kotlin', /a template \$\{ that is not closed/]
]) {
  test(`lexer: ${name} that is not closed is refused`, () => fails(text, language, pattern));
}

test('lexer: templates nested past the limit and too many tokens are refused', () => {
  fails(`val s = ${'"${'.repeat(70)}`, 'kotlin', /templates nested more than 64 deep/);
  assert.throws(() => tokenize('a b c d', 'java', { maxTokens: 3 }), /more than 3 tokens/);
});

test('lexer: a problem has its line and column', () => {
  const text = 'class A {\n  String s = "x\n}';
  try {
    tokenize(text);
    assert.fail('not refused');
  } catch (error) {
    assert.equal(lexProblem(error, text), 'line 2, column 14: a string that is not closed before the end of its line');
  }
});
