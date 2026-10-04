import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigError, DEFAULT_EXCLUDE, DEFAULT_FILES, DEFAULT_RULES, KEYS, defaultConfig, globMatch, globProblem, isIncluded, defaultsAsConfig, distance, isDottedName, isObject, kindOf, readConfig, suggestion, validateConfig } from '../src/index.js';

// The configuration file: every key, the list operations, the errors with their lines and suggestions.

const problems = (text) => {
  try {
    readConfig(text, 'c.json');
  } catch (error) {
    assert.ok(error instanceof ConfigError, error.message);
    return error.problems;
  }
  assert.fail('not refused');
  return [];
};

test('config: the defaults, and --print-defaults read back give the same configuration', () => {
  const d = defaultConfig();
  assert.deepEqual(d.files, DEFAULT_FILES);
  assert.deepEqual(d.exclude, DEFAULT_EXCLUDE);
  assert.deepEqual(d.rules, DEFAULT_RULES);
  assert.deepEqual(d.packages, []);
  assert.deepEqual(d.ignore, []);
  assert.equal(d.minSeverity, 'notice');
  const back = readConfig(JSON.stringify(defaultsAsConfig()), 'd.json');
  assert.deepEqual({ ...back, file: null, name: null }, d);
  assert.deepEqual(Object.keys(defaultsAsConfig()), Object.keys(KEYS));
});

test('config: every key with a good value', () => {
  const c = readConfig(JSON.stringify({ name: 'Shop', files: ['src/**/*.java'], exclude: { add: ['**/gen/**'], remove: ['build/**'] }, packages: { 'javax.cache': 'jakarta.cache' }, ignore: ['javax.annotation.PreDestroy'], rules: { javaxNameInText: 'off', javaxImport: 'warning' }, minSeverity: 'warning' }), 'c.json');
  assert.equal(c.name, 'Shop');
  assert.equal(c.file, 'c.json');
  assert.deepEqual(c.files, ['src/**/*.java']);
  assert.deepEqual(c.exclude, ['target/**', '*/target/**', '*/build/**', '**/gen/**']);
  assert.deepEqual(c.packages, [{ from: 'javax.cache', to: 'jakarta.cache', spec: null }]);
  assert.deepEqual(c.ignore, ['javax.annotation.PreDestroy']);
  assert.equal(c.rules.javaxNameInText, 'off');
  assert.equal(c.rules.javaxImport, 'warning');
  assert.equal(c.minSeverity, 'warning');
});

test('config: an unknown key is an error with its line and a suggestion, at every level', () => {
  assert.deepEqual(problems('{\n  "exlude": []\n}'), ['c.json: line 2: "exlude" is not a key of the configuration; did you mean "exclude"?']);
  assert.deepEqual(problems('{\n  "rules": {\n    "javaxImprt": "off"\n  }\n}'), ['c.json: line 3: "javaxImprt" is not a key of rules; did you mean "javaxImport"?']);
  assert.deepEqual(problems('{"files": {"ad": ["*.java"]}}'), ['c.json: line 1: "ad" is not a key of files (replace, add, remove); did you mean "add"?']);
  assert.deepEqual(problems('{"colour": 1}'), ['c.json: line 1: "colour" is not a key of the configuration']);
});

test('config: a key named twice is refused, as RFC 8259 leaves the result open', () => {
  assert.match(problems('{"name": "a", "name": "b"}')[0], /^c\.json: line 1, column 15: the name "name" appears twice in one object/);
});

test('config: values of the wrong kind, each with its line', () => {
  const text = JSON.stringify({ name: '', files: 'x', exclude: [1], packages: [], ignore: ['javax'], rules: [], minSeverity: 'fatal' }, null, 2);
  assert.deepEqual(problems(text), [
    'c.json: line 2: name must be a text of 1 to 120 characters',
    'c.json: line 3: files must be a list or an object with replace, add or remove, not a string',
    'c.json: line 5: exclude[0] must be a text, not a number',
    'c.json: line 7: packages must be an object of javax names, each with its jakarta name, not a list',
    'c.json: line 9: ignore[0]: "javax" is not a javax name such as javax.annotation.Resource',
    'c.json: line 11: rules must be an object, not a list',
    'c.json: line 12: minSeverity must be one of notice, warning, error'
  ]);
});

test('config: packages adds only javax names the mapping does not hold, each with a jakarta name', () => {
  const text = JSON.stringify({ packages: { 'javax.servlet': 'jakarta.servlet', 'javax.crypto': 'jakarta.crypto', 'java.cache': 'jakarta.cache', 'javax.cache': 'javax.cache2', 'javax.money': 3, __proto__: 'x' } }, null, 2);
  const p = problems(text);
  assert.equal(p.length, 5);
  assert.match(p[0], /javax\.servlet is in the mapping already \(src\/mapping\.js\)/);
  assert.match(p[1], /javax\.crypto is in the mapping already/);
  assert.match(p[2], /"java\.cache" is not a javax name such as javax\.example\.api/);
  assert.match(p[3], /packages\.javax\.cache must be a jakarta name such as jakarta\.example\.api, not "javax\.cache2"/);
  assert.match(p[4], /packages\.javax\.money must be a jakarta name such as jakarta\.example\.api, not a number/);
});

test('config: a name such as __proto__ is an ordinary key and is refused like any other', () => {
  assert.match(problems('{"__proto__": {"files": []}}')[0], /"__proto__" is not a key of the configuration/);
  assert.match(problems('{"packages": {"__proto__": "jakarta.x"}}')[0], /"__proto__" is not a javax name/);
  assert.match(problems('{"rules": {"constructor": "off"}}')[0], /"constructor" is not a key of rules/);
  assert.equal({}.files, undefined);
});

test('config: the list operations replace, add and remove, and their errors', () => {
  assert.deepEqual(readConfig('{"ignore": {"replace": ["javax.a.B"], "add": ["javax.c.D"]}}', 'c').ignore, ['javax.a.B', 'javax.c.D']);
  assert.deepEqual(problems('{"exclude": {"remove": ["nope/**"]}}'), ['c.json: line 1: exclude.remove names "nope/**", which is not on the list']);
  assert.deepEqual(problems('{"exclude": {"add": ["build/**"]}}'), ['c.json: line 1: exclude.add names "build/**", which is already on the list']);
  assert.deepEqual(problems('{"ignore": ["javax.a.B", "javax.a.B"]}'), ['c.json: line 1: ignore names "javax.a.B" twice']);
  assert.deepEqual(problems('{"files": []}'), ['c.json: line 1: files has no pattern left, so no file of a folder would be read']);
  assert.match(problems(JSON.stringify({ ignore: Array.from({ length: 501 }, (_, i) => `javax.a${i}.B`) }))[0], /holds more than 500 entries/);
  assert.match(problems(JSON.stringify({ ignore: [`javax.${'a'.repeat(300)}`] }))[0], /must hold 1 to 200 characters/);
});

test('config: a file pattern is checked, and a rule level must be a level or off', () => {
  for (const bad of ['/abs/*.java', '../x', 'a/**b', '[ab].java', 'a\\b']) assert.match(problems(JSON.stringify({ files: [bad] }))[0], /is not a file pattern/, bad);
  assert.match(problems('{"rules": {"javaxImport": "fatal"}}')[0], /rules\.javaxImport must be one of notice, warning, error, off, not "fatal"/);
  assert.match(problems('{"rules": {"javaxImport": 1}}')[0], /not a number/);
});

test('config: the configuration must be an object, and JSON errors have their line and column', () => {
  assert.deepEqual(problems('[]'), ['c.json: line 1: the configuration must be a JSON object, not a list']);
  assert.deepEqual(problems('{\n  "name": "x",\n}'), ['c.json: line 3, column 1: a comma before the closing brace; JSON has no trailing comma']);
  assert.throws(() => validateConfig(null), /must be a JSON object, not null/);
});

test('config: helpers for the suggestions and the kinds of values', () => {
  assert.equal(distance('name', 'nmae'), 1);
  assert.equal(distance('', 'abc'), 3);
  assert.equal(suggestion('ignor', ['ignore', 'files']), '; did you mean "ignore"?');
  assert.equal(suggestion('somethingelse', ['ignore']), '');
  assert.deepEqual([null, [], {}, 1, 'x', true].map(kindOf), ['null', 'a list', 'an object', 'a number', 'a string', 'a boolean']);
  assert.equal(isObject({}), true);
  assert.equal(isObject([]), false);
  assert.equal(isDottedName('javax.a.B', 'javax'), true);
  assert.equal(isDottedName('javax', 'javax'), false);
  assert.equal(isDottedName('javax..a', 'javax'), false);
  assert.equal(isDottedName('jakarta.a', 'javax'), false);
  assert.equal(isDottedName(3, 'javax'), false);
});

test('patterns: *, ? and ** match by parts, a pattern with no slash matches the file name anywhere, and the rest is refused', () => {
  assert.equal(globMatch('**/*.java', 'A.java'), true);
  assert.equal(globMatch('**/*.java', 'src/main/java/A.java'), true);
  assert.equal(globMatch('**/*.java', 'src/readme.md'), false);
  assert.equal(globMatch('src/*.java', 'src/A.java'), true);
  assert.equal(globMatch('src/*.java', 'src/x/A.java'), false);
  assert.equal(globMatch('**/META-INF/services/*', 'META-INF/services/a.B'), true);
  assert.equal(globMatch('**/META-INF/services/*', 'm/src/main/resources/META-INF/services/a.B'), true);
  assert.equal(globMatch('**/META-INF/services/*', 'META-INF/services/x/a.B'), false);
  assert.equal(globMatch('*/target/**', 'm/target/classes/A.java'), true);
  assert.equal(globMatch('*/build/**', 'src/main/java/com/acme/build/A.java'), false);
  assert.equal(globMatch('**/t?.kt', 'a/b/t1.kt'), true);
  assert.equal(globMatch('**/t?.kt', 't12.kt'), false);
  assert.equal(globMatch('*.kts', 'deep/down/a.kts'), true);
  assert.equal(globMatch('a*b*c', 'aXbYbZc'), true);
  assert.equal(globMatch('a*b*c', 'aXbYbZ'), false);
  assert.equal(isIncluded('target/A.java', DEFAULT_FILES, DEFAULT_EXCLUDE), false);
  assert.equal(isIncluded('src/A.java', DEFAULT_FILES, DEFAULT_EXCLUDE), true);
  assert.equal(isIncluded('src/notes.txt', DEFAULT_FILES, DEFAULT_EXCLUDE), false);
  for (const bad of ['', '/abs', 'a/../b', 'a//b', './a', '[ab].java', '{a,b}.java', '!a.java', 'a\\b', 'a**', 'x'.repeat(201), `a${String.fromCharCode(1)}`]) assert.notEqual(globProblem(bad), null, bad);
  assert.equal(globProblem('src/**/*.java'), null);
  assert.equal(globProblem(3), 'must hold 1 to 200 characters');
});
