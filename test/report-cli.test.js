import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NOTICE, USAGE, VERSION, escapeData, escapeProperty, parseArgs, toGithub, toJson, toText } from '../src/index.js';
import { cli, java, reportOf, run, withFiles } from './helpers.js';

const GOOD = { 'app/src/A.java': 'package a;\nimport jakarta.servlet.Filter;\nimport javax.crypto.Cipher;\nclass A {}\n' };
const BAD = { 'app/src/A.java': 'package a;\nimport javax.servlet.Filter;\nclass A {}\n' };
const WARN = { 'app/src/A.java': 'package a;\nclass A { String s = "javax.servlet.Filter"; }\n' };

test('cli: exit 0 with no error, 1 with an error, and a warning alone does not fail the run', async () => {
  const good = await run(GOOD, ['app']);
  assert.equal(good.code, 0, good.err);
  assert.match(good.out, /^jakarta-migration-check: app\ninput: app \(1 file: 1 java\)\nconfig: built-in defaults: 20 file patterns, 4 exclude patterns, no added moves, no ignored names; minimum severity notice\nrules: javax-import \(error\); /);
  assert.match(good.out, /RESULT: PASS - no error\n$/);
  assert.equal(good.err, '');
  const bad = await run(BAD, ['app']);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /RESULT: FAIL - 1 error\n$/);
  const warning = await run(WARN, ['app']);
  assert.equal(warning.code, 0);
  assert.match(warning.out, /RESULT: PASS - no error \(1 warning\)\n$/);
  const raised = await run({ ...WARN, 'c.json': '{"rules": {"javaxNameInText": "error"}}' }, ['app', '--config', 'c.json']);
  assert.equal(raised.code, 1);
  assert.match(raised.out, /\nconfig: c\.json: 20 file patterns/);
});

test('cli: several paths, files and folders, read together in the order given, each file once', async () => {
  const r = await run({ ...BAD, 'more/pom.xml': '<project><dependencies><dependency><groupId>javax.jms</groupId><artifactId>jms-api</artifactId></dependency></dependencies></project>', 'one/B.kt': 'import javax.inject.Inject\n' }, ['app', 'more', 'one/B.kt', 'app/src/A.java']);
  assert.equal(r.code, 1, r.err);
  assert.match(r.out, /^jakarta-migration-check: app, more, one\/B\.kt, app\/src\/A\.java\ninput: app, more, one\/B\.kt, app\/src\/A\.java \(3 files: 1 java, 1 kotlin, 1 maven\)/);
  assert.match(r.out, /findings: 3 \(3 error\)/);
});

test('cli: the build output, .git and node_modules are not read, and the patterns of the configuration are', async () => {
  const files = { ...GOOD, 'app/target/gen/B.java': BAD['app/src/A.java'], 'app/m/build/C.java': BAD['app/src/A.java'], 'app/.git/D.java': BAD['app/src/A.java'], 'app/node_modules/x/E.java': BAD['app/src/A.java'], 'app/src/com/acme/build/F.java': BAD['app/src/A.java'] };
  const r = await run(files, ['app', '--json']);
  assert.deepEqual(JSON.parse(r.out).input.files.map((f) => f.file), ['app/src/A.java', 'app/src/com/acme/build/F.java'], 'a package named build is still read');
  const only = await run({ ...files, 'c.json': '{"files": ["src/**/*.java"], "exclude": ["**/acme/**"]}' }, ['app', '--config', 'c.json', '--json']);
  assert.deepEqual(JSON.parse(only.out).input.files.map((f) => f.file), ['app/src/A.java']);
});

test('cli: exit 2 for usage errors, with the usage and nothing on standard output', async () => {
  for (const [args, message] of [
    [[], /give the project to check: a folder, or source, build and descriptor files/],
    [['app', 'app'], /app is named twice/],
    [['app', '--bogus'], /unknown argument --bogus/],
    [['app', '--format', 'html'], /unknown format html \(text, json or github\)/],
    [['app', '--format', 'json', '--format', 'text'], /--format was given twice/],
    [['app', '--json', '--format', 'github'], /--json and --format github ask for two formats; give one/],
    [['app', '--min-severity', 'fatal'], /unknown level fatal/],
    [['app', '--config'], /--config needs a value/],
    [['app', '--config', '--json'], /--config needs a value/],
    [['app', '--config', 'a.json', '--config', 'b.json'], /--config was given twice/],
    [['app', '--summary', '--json'], /--summary adds a table to the text report; the json format has no place for it \(the JSON report always holds summary\.packages\)/],
    [['app', '--summary', '--format', 'github'], /the github format has no place for it\n/],
    [['-'], /reading from standard input is not supported/],
    [['app', '--config', '-'], /reading from standard input is not supported/],
    [['https://example.com/project'], /give a local path; the tool never fetches a URL/],
    [['app', '--config', 'file://c.json'], /give a local path; the tool never fetches a URL/],
    [[...Array.from({ length: 101 }, (_, i) => `f${i}.java`)], /more than 100 paths/]
  ]) {
    const r = await run(GOOD, args);
    assert.equal(r.code, 2, args.join(' '));
    assert.match(r.err, message);
    assert.ok(r.err.includes('Usage: jakarta-migration-check'), args.join(' ').slice(0, 60));
    assert.equal(r.out, '');
  }
  assert.equal(parseArgs(['a', '--json', '--format', 'json']).format, 'json');
});

test('cli: exit 2 for input errors, with every problem and no result', async () => {
  const missing = await run(GOOD, ['nowhere']);
  assert.equal(missing.code, 2);
  assert.equal(missing.err, 'jakarta-migration-check: no result, the input has a problem:\n  nowhere: no such file\n');
  assert.equal(missing.out, '');
  assert.match((await run({ 'docs/a.md': 'x' }, ['docs'])).err, /docs: no file in this folder matches \*\*\/\*\.java, \*\*\/\*\.kt/);
  assert.match((await run({ ...GOOD, 'c.json': '{"exlude": []}' }, ['app', '--config', 'c.json'])).err, /c\.json: line 1: "exlude" is not a key of the configuration; did you mean "exclude"\?/);
  assert.match((await run(GOOD, ['app', '--config', 'none.json'])).err, /none\.json: no such file/);
  assert.match((await run({ 'A.java': Buffer.from([105, 0, 1]) }, ['A.java'])).err, /A\.java: holds binary data \(a null byte\); only text is read/);
  assert.match((await run({ 'notes.txt': 'javax.servlet.Filter' }, ['notes.txt'])).err, /notes\.txt: not a kind of file the tool reads \(a \.java, \.kt or \.kts source, a pom\.xml, a Gradle build, a version catalog, a deployment descriptor of docs\/method\.md or a file under META-INF\/services\)/);
  const two = await run({ 'p/A.java': 'class A { String s = "x;\n}', 'p/web.xml': '<web-app><a></web-app>', 'p/B.java': 'class B {}' }, ['p']);
  assert.equal(two.code, 2);
  assert.equal(two.err, 'jakarta-migration-check: no result, the input has problems:\n  p/A.java: line 1, column 22: a string that is not closed before the end of its line\n  p/web.xml: line 1, column 13: the end tag </web-app> does not match <a>\n');
  const kind = await run({ ...GOOD, 'c.json': '{"files": {"add": ["**/*.txt"]}}', 'app/notes.txt': 'x' }, ['app', '--config', 'c.json']);
  assert.match(kind.err, /app\/notes\.txt: not a kind of file the tool reads/);
});

test('cli: --help, --version and --print-defaults exit 0 and need no input', async () => {
  const help = await run({}, ['--help']);
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const option of ['--config', '--format', '--json', '--min-severity', '--explain', '--summary', '--print-defaults', '--help', '--version']) assert.ok(USAGE.includes(option), option);
  assert.equal((await run({}, ['--version'])).out, `${VERSION}\n`);
  assert.equal((await run({}, ['-v'])).out, `${VERSION}\n`);
  assert.equal((await run({}, ['-h'])).out, USAGE);
  const defaults = await run({}, ['--print-defaults']);
  assert.equal(defaults.code, 0);
  assert.equal(JSON.parse(defaults.out).name, 'built-in defaults');
  const back = await run({ ...BAD, 'd.json': defaults.out }, ['app', '--config', 'd.json']);
  assert.equal(back.code, 1, back.err);
  assert.match(back.out, /\nconfig: d\.json \(built-in defaults\): /);
});

test('cli: --min-severity hides findings below it, and the command line wins over the configuration', async () => {
  const files = { 'app/src/A.java': 'package a;\nimport javax.servlet.Filter;\nclass A { String s = "javax.servlet.Filter"; }\n' };
  assert.match((await run(files, ['app'])).out, /findings: 2 \(1 error, 1 warning\)/);
  const errors = await run(files, ['app', '--min-severity', 'error']);
  assert.match(errors.out, /findings: 1 \(1 error\); 1 below error not shown/);
  assert.match(errors.out, /note: 1 finding below error is not shown/);
  assert.ok(!errors.out.includes('WARNING '));
  const cfg = await run({ ...files, 'c.json': '{"minSeverity": "error"}' }, ['app', '--config', 'c.json', '--min-severity', 'notice']);
  assert.match(cfg.out, /findings: 2 \(1 error, 1 warning\)/);
  assert.match((await run({ ...files, 'c.json': '{"minSeverity": "error"}' }, ['app', '--config', 'c.json'])).out, /findings: 1 \(1 error\); 1 below error not shown/);
});

test('text: the findings with their level, rule and place, what was read, the notice and the result', () => {
  const r = reportOf({ ...java('import javax.servlet.Filter;', 'import javax.crypto.Cipher;', 'import javax.cache.Cache;', 'class A { javax.xml.parsers.DocumentBuilder b; }'), 'pom.xml': '<project><dependencies><dependency><groupId>javax.el</groupId><artifactId>el-api</artifactId></dependency></dependencies></project>', 'META-INF/services/org.x.Spi': 'org.x.Impl\n' });
  const out = toText(r);
  assert.match(out, /\n {2}ERROR {4}javax-import {14}src\/A\.java:3\n {11}import javax\.servlet\.Filter: moved to jakarta\.servlet\.Filter \(Jakarta Servlet 5\.0\)\n/);
  assert.match(out, /\nRead: src\/A\.java, pom\.xml, META-INF\/services\/org\.x\.Spi\n\n {2}files {10}3: 1 java, 1 maven, 1 service\n {2}imports {8}3 read; javax imports 3: 1 moved, 1 in the JDK, 1 not in the mapping\n {2}code names {5}javax names written out in full 1: 1 in the JDK\n {2}texts {10}javax names in strings and descriptor values 0\n {2}dependencies {3}1 read; 1 Java EE artifact\n {2}descriptors {4}0 read; 0 with a namespace of Java EE\n {2}service files {2}1 read\n {2}mapping {8}32 moved prefixes, 7 moved classes, 30 JDK prefixes, 49 artifacts, 11 namespaces; 0 added and 0 ignored by the configuration\n/);
  assert.ok(out.includes(`\n${NOTICE}\n\nRESULT: FAIL - 2 errors\n`));
  assert.ok(!out.includes('Per package'));
  const explained = toText(r, { explain: true });
  assert.match(explained, /\n {11}rule: an import in a Java or Kotlin file of a class/);
  assert.match(explained, /\n {11}specification: Jakarta Servlet 5\.0, https:\/\/jakarta\.ee\/specifications\/servlet\/5\.0\/\n/);
  assert.match(explained, /\n {11}basis: Jakarta EE 9 gives the specifications of Jakarta EE 8, .* \(Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 \(Eclipse Foundation\), https:\/\/jakarta\.ee\/specifications\/platform\/9\/jakarta-platform-spec-9\.html\)\n/);
  assert.match(explained, /\n {11}the tool's own choice: only the names of the mapping are reported/);
  const summary = toText(r, { summary: true });
  assert.ok(summary.includes(['', 'Per package', '', '  from           to               findings  files  rules', '  javax.el       jakarta.el       1         1      javax-artifact 1', '  javax.servlet  jakarta.servlet  1         1      javax-import 1', '', 'Read: '].join('\n')));
  assert.match(toText(reportOf(java('class A {}')), { summary: true }), /\nPer package\n\n {2}none\n/);
});

test('text: a configuration with a name, added moves and ignored names, and a note for every rule set to off', () => {
  const out = toText(reportOf(java('class A {}'), { name: 'Shop', packages: { 'javax.cache': 'jakarta.cache' }, ignore: ['javax.a.B', 'javax.c.D'], rules: { javaxImport: 'off', javaxArtifact: 'off' } }));
  assert.match(out, /\nconfig: config\.json \(Shop\): 20 file patterns, 4 exclude patterns, 1 added move, 2 ignored names; minimum severity notice\n/);
  assert.match(out, /\nnote: 2 rules are off: javax-import, javax-artifact\n/);
  assert.match(out, /0 added and 0 ignored|1 added and 2 ignored by the configuration/);
});

test('json: the whole report, with the basis of each finding only when asked', () => {
  const r = reportOf(java('import javax.servlet.Filter;'));
  const plain = JSON.parse(toJson(r));
  assert.equal(plain.tool, 'jakarta-migration-check');
  assert.deepEqual(Object.keys(plain), ['tool', 'version', 'input', 'config', 'summary', 'findings', 'totals', 'result', 'notes', 'notice']);
  assert.deepEqual(Object.keys(plain.findings[0]), ['rule', 'level', 'file', 'line', 'column', 'at', 'found', 'from', 'to', 'spec']);
  assert.deepEqual([plain.findings[0].from, plain.findings[0].to, plain.findings[0].column], ['javax.servlet', 'jakarta.servlet', 8]);
  assert.deepEqual(plain.result, { pass: false, errors: 1, byLevel: { error: 1, warning: 0, notice: 0 }, text: 'FAIL - 1 error' });
  assert.equal(plain.config.rules.length, 7);
  assert.deepEqual(plain.summary.packages, [{ from: 'javax.servlet', to: 'jakarta.servlet', findings: 1, files: 1, rules: { 'javax-import': 1 } }]);
  assert.deepEqual(plain.input.files, [{ file: 'src/A.java', kind: 'java' }]);
  const explained = JSON.parse(toJson(r, { explain: true }));
  assert.equal(explained.findings[0].basis[0].url, 'https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html');
  assert.match(explained.findings[0].own, /^only the names of the mapping are reported/);
});

test('github: one workflow command per finding at its level, with the file, line and column, then a summary line', () => {
  const lines = toGithub(reportOf({ 'app/src/A.java': 'package a;\nimport javax.servlet.Filter;\nclass A { String s = "javax.servlet.Filter"; }\n' })).trimEnd().split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], '::error file=app/src/A.java,line=2,col=8,title=jakarta-migration-check javax-import::import javax.servlet.Filter: moved to jakarta.servlet.Filter (Jakarta Servlet 5.0)');
  assert.match(lines[1], /^::warning file=app\/src\/A\.java,line=3,col=22,title=jakarta-migration-check javax-name-in-text::/);
  assert.equal(lines[2], 'jakarta-migration-check: app/src/A.java: 1 file, 2 findings; RESULT: FAIL - 1 error (and 1 warning)');
  assert.equal(toGithub(reportOf(java('class A {}'))), 'jakarta-migration-check: src/A.java: 1 file, 0 findings; RESULT: PASS - no error\n');
  assert.match(toGithub(reportOf(java('import javax.servlet.Filter;'), { rules: { javaxImport: 'notice' } })), /^::notice file=src\/A\.java,line=3,col=8,/);
});

test('github: the characters a workflow command gives a meaning to are escaped, so a finding cannot start another command', () => {
  assert.equal(escapeData('a%b\r\nc'), 'a%25b%0D%0Ac');
  assert.equal(escapeProperty('dir/a,b:c.java'), 'dir/a%2Cb%3Ac.java');
  const r = reportOf({ 'a,b:c.java': 'class A { String s = "100% ::error::x javax.servlet.Filter"; }\n' });
  const out = toGithub(r);
  assert.equal(out.split('\n')[0], '::warning file=a%2Cb%3Ac.java,line=1,col=22,title=jakarta-migration-check javax-name-in-text::the string "100%25 ::error::x javax.servlet.Filter" names javax.servlet.Filter, which moved to jakarta.servlet.Filter (Jakarta Servlet 5.0); a class name read by reflection, a property name or a key must change with it');
  assert.equal(out.split('\n').filter((l) => l.startsWith('::')).length, 1);
});

test('cli: a run reads its inputs and writes nothing to the folder', async () => {
  await withFiles(BAD, async (dir) => {
    for (const args of [['--format', 'text'], ['--format', 'json'], ['--format', 'github'], ['--explain'], ['--summary']]) assert.equal((await cli(['app', ...args], dir)).code, 1);
    assert.deepEqual((await readdir(dir)).sort(), ['app']);
    assert.deepEqual(await readdir(resolve(dir, 'app/src')), ['A.java']);
  });
});
