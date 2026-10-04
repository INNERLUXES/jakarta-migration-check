import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FILE_LIMITS, LIMITS, LexError, MAX_PROBLEMS, XmlError, parseXml, tokenize } from '../src/index.js';
import { cli, reportOf, rulesOf, run, withFiles } from './helpers.js';

// Hostile input: files built to exhaust the memory or the time, to make the tool follow a link, to rewrite the
// terminal, to start a second workflow command or to change how objects behave. Each heavy test also checks the time,
// because work that grows faster than the input is a failure even when the answer is right. Tests that need a symbolic
// link, a device or file permissions are guarded with process.platform, and none of them asserts a line: lines are
// asserted in the tests that run everywhere.

const LIMIT = { timeout: 180000 };
// Coverage counting slows every line of the tool several times over, so a run with --experimental-test-coverage gets a
// wider time limit. A plain `npm test` keeps the tight one, and that is the run that guards against slow growth.
// The runner sets NODE_V8_COVERAGE for its test processes only when coverage is on.
const COVERAGE = Boolean(process.env.NODE_V8_COVERAGE);
const fast = async (fn, ms = 5000) => {
  const limit = COVERAGE ? ms * 4 : ms;
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < limit, `took ${Date.now() - start} ms`);
  return result;
};

const BAD = 'package a;\nimport javax.servlet.Filter;\nclass A {}\n';
const GOOD = { 'p/A.java': BAD };

test('hostile: a file or a configuration over its size limit is refused before it is read', LIMIT, async () => {
  const big = await fast(() => run({ 'Big.java': `class A {}\n${' '.repeat(FILE_LIMITS.maxFileBytes)}` }, ['Big.java']));
  assert.equal(big.code, 2);
  assert.match(big.err, /Big\.java: [\d,]+ bytes is over the 4 MB limit/);
  const config = await run({ ...GOOD, 'c.json': ' '.repeat(FILE_LIMITS.maxConfigBytes + 1) }, ['p', '--config', 'c.json']);
  assert.equal(config.code, 2);
  assert.match(config.err, /c\.json: [\d,]+ bytes is over the 1 MB limit/);
  const small = await run(GOOD, ['p'], { maxFileBytes: 10 });
  assert.match(small.err, /over the 10 byte limit/);
  const total = await run({ 'x/A.java': BAD, 'x/B.java': BAD }, ['x'], { maxTotalBytes: 60 });
  assert.equal(total.code, 2);
  assert.match(total.err, /x\/B\.java: the files read so far hold more than 60 bytes, the limit of one run/);
});

test('hostile: a thousand files of a hundred imports each are read in seconds, and each rule lists at most its limit', LIMIT, async () => {
  const imports = Array.from({ length: 100 }, (_, i) => `import javax.servlet.C${i};`).join('\n');
  const files = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`x/f${String(i).padStart(4, '0')}/A.java`, `package a;\n${imports}\nclass A { String s = "javax.persistence.X"; }\n`]));
  const r = await fast(() => run(files, ['x', '--json']), 30000);
  const json = JSON.parse(r.out);
  assert.equal(json.totals.findings, 101000);
  assert.equal(json.findings.filter((f) => f.rule === 'javax-import').length, LIMITS.maxFindingsPerRule);
  assert.ok(json.notes.some((n) => /findings past the limit of 500 per rule are counted but not listed/.test(n)));
  assert.equal(json.summary.packages[0].findings, 100000);
});

test('hostile: long runs of quotes, backslashes, comment openers, braces and dots are read in one pass', LIMIT, async () => {
  for (const [text, language] of [
    [`String s = "${'\\"'.repeat(500000)}";`, 'java'],
    [`/*${'/*'.repeat(200000)}${'*/'.repeat(200001)}`, 'kotlin'],
    [`/*${'/*'.repeat(200000)}*/`, 'java'],
    [`val s = """${'"'.repeat(500000)}`, 'kotlin'],
    [`val s = "${'${'.repeat(60)}${'}'.repeat(60)}"`, 'kotlin'],
    [`${'{'.repeat(500000)}`, 'kotlin'],
    [`javax${'.a'.repeat(300000)}`, 'java'],
    [`${"'".repeat(1000001)}`, 'java'],
    [`String s = """${'\\'.repeat(400000)}`, 'java']
  ]) {
    await fast(() => {
      try {
        tokenize(text, language);
      } catch (error) {
        assert.ok(error instanceof LexError, error.message);
      }
    });
  }
  const long = await fast(() => reportOf({ 'A.java': `class A { Object x = javax${'.a'.repeat(100000)}; String s = "${'javax.servlet.'.repeat(20000)}X"; }` }));
  assert.ok(long.findings.length <= 2);
});

test('hostile: deep, wide and repetitive XML is read or refused fast, and a declared entity is never expanded', LIMIT, async () => {
  await fast(() => assert.throws(() => parseXml('<a>'.repeat(100000)), XmlError));
  await fast(() => parseXml(`<a>${'<b x="1"/>'.repeat(200000)}</a>`));
  await fast(() => assert.throws(() => parseXml(`<a ${Array.from({ length: 300 }, (_, i) => `x${i}="1"`).join(' ')}/>`), /more than 256 attributes/));
  await fast(() => assert.throws(() => parseXml(`<a><!--${'-'.repeat(1000000)}`), /a comment that is not closed/));
  const laughs = `<?xml version="1.0"?>\n<!DOCTYPE lolz [\n${Array.from({ length: 10 }, (_, i) => `<!ENTITY lol${i + 1} "${`&lol${i};`.repeat(10)}">`).join('\n')}\n]>\n<web-app>&lol10;</web-app>\n`;
  const r = await fast(() => reportOf({ 'web.xml': laughs }));
  assert.deepEqual(rulesOf(r), []);
  const external = reportOf({ 'web.xml': '<!DOCTYPE web-app SYSTEM "file:///etc/passwd"><web-app>&xxe;</web-app>' });
  assert.deepEqual(rulesOf(external), [], 'an external DOCTYPE is only text');
});

test('hostile: a set with a hundred broken files lists twenty problems and a count', LIMIT, async () => {
  const files = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`x/F${String(i).padStart(3, '0')}.java`, 'class A { String s = "']));
  const r = await fast(() => run(files, ['x']));
  assert.equal(r.code, 2);
  assert.match(r.err, /the input has problems:/);
  assert.match(r.err, /\n {2}and 80 more\n$/);
  assert.equal(r.err.split('\n').filter((l) => l.startsWith('  x/')).length, MAX_PROBLEMS);
});

test('hostile: CRLF, CR and a byte order mark give the same report as LF', async () => {
  const files = {
    'p/A.java': 'package a;\nimport javax.servlet.Filter;\nclass A {\n  String s = "javax.ws.rs.GET";\n}\n',
    'p/B.kt': 'package b\nimport javax.inject.Inject\n/* x\n */\nval s = """\njavax.el.ELContext\n"""\n',
    'p/pom.xml': '<project>\n<dependencies>\n<dependency>\n<groupId>javax.el</groupId>\n<artifactId>el-api</artifactId>\n</dependency>\n</dependencies>\n</project>\n',
    'p/build.gradle': "dependencies {\n  implementation 'javax.jms:jms-api:1.1'\n}\n",
    'p/web.xml': '<?xml version="1.0"?>\n<web-app\n xmlns="http://xmlns.jcp.org/xml/ns/javaee">\n<param-name>javax.faces.X</param-name>\n</web-app>\n',
    'p/META-INF/services/javax.ws.rs.ext.Providers': '# x\njavax.json.spi.JsonProvider\n'
  };
  const lf = await run(files, ['p', '--json']);
  assert.equal(lf.code, 1, lf.err);
  assert.equal(JSON.parse(lf.out).totals.findings, 10);
  for (const eol of ['\r\n', '\r']) {
    const changed = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, `${String.fromCharCode(0xfeff)}${v.split('\n').join(eol)}`]));
    const r = await run(changed, ['p', '--json']);
    assert.equal(r.out, lf.out, JSON.stringify(eol));
  }
});

test('hostile: control, escape and direction characters in file names, names and strings never reach the reports', async () => {
  const esc = String.fromCharCode(27);
  const rlo = String.fromCharCode(0x202e);
  const ls = String.fromCharCode(0x2028);
  const files = { [`p/A${rlo}.java`]: `package a;\nimport javax.servlet.Filter;\nclass A { String s = "javax.servlet.X${esc}[2J${rlo}${ls}"; }\n`, [`bad${rlo}.java`]: `class A { String s = "${esc}` };
  for (const format of ['text', 'json', 'github']) {
    const r = await run(files, ['p', '--format', format, ...(format === 'text' ? ['--explain', '--summary'] : format === 'json' ? ['--explain'] : [])]);
    assert.equal(r.code, 1, r.err);
    for (const c of [esc, rlo, ls]) assert.ok(!r.out.includes(c) && !r.err.includes(c), `${format}: ${c.charCodeAt(0)}`);
  }
  const bad = await run(files, [`bad${rlo}.java`]);
  assert.equal(bad.code, 2);
  assert.ok(!bad.err.includes(esc) && !bad.err.includes(rlo));
});

test('hostile: constructor, toString and __proto__ as names, values and keys are only data', async () => {
  const r = reportOf({ 'A.java': 'class __proto__ { String constructor = "javax.servlet.toString"; javax.__proto__.X x; }', 'META-INF/services/__proto__': 'javax.servlet.__proto__\n', 'web.xml': '<web-app __proto__="javax.servlet.constructor"><constructor/></web-app>' });
  assert.deepEqual(rulesOf(r).sort(), ['javax-name-in-text', 'javax-name-in-text', 'javax-service-file']);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  const cfg = await run({ ...GOOD, 'c.json': '{"rules": {"toString": "off"}, "packages": {"javax.hasOwnProperty": "jakarta.hasOwnProperty"}}' }, ['p', '--config', 'c.json']);
  assert.equal(cfg.code, 2);
  assert.match(cfg.err, /"toString" is not a key of rules/);
});

test('hostile: empty files of every kind are read without a crash', async () => {
  const files = { 'p/A.java': '', 'p/B.kt': '', 'p/build.gradle': '', 'p/libs.versions.toml': '', 'p/META-INF/services/x.Y': '' };
  const r = await run(files, ['p']);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /\(5 files: 1 java, 1 kotlin, 1 gradle, 1 catalog, 1 service\)/);
  assert.equal((await run({ 'pom.xml': '' }, ['pom.xml'])).code, 2, 'an XML file with no root element');
});

test('hostile: a file named through a symbolic link is refused, and a link inside a folder is skipped, not followed', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows needs extra rights to make a symbolic link');
    return;
  }
  await withFiles({ 'x/A.java': BAD, 'secret/S.java': BAD, 'c.json': '{}' }, async (dir) => {
    await symlink(resolve(dir, 'x/A.java'), resolve(dir, 'Linked.java'));
    await symlink(resolve(dir, 'secret'), resolve(dir, 'x/inside'));
    await symlink(resolve(dir, 'secret/S.java'), resolve(dir, 'x/S.java'));
    await symlink(resolve(dir, 'c.json'), resolve(dir, 'c-link.json'));
    const r = await cli(['Linked.java'], dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /Linked\.java: is a symbolic link, which is not followed/);
    const c = await cli(['x', '--config', 'c-link.json'], dir);
    assert.equal(c.code, 2);
    assert.match(c.err, /is a symbolic link/);
    const walk = await cli(['x'], dir);
    assert.equal(walk.code, 1, walk.err);
    assert.match(walk.out, /\(1 file: 1 java\)/);
    assert.match(walk.out, /note: 2 symbolic links inside the folders were skipped, not followed/);
  });
});

test('hostile: a device named as a source or the configuration is refused', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows has no /dev/zero to name as an input');
    return;
  }
  await withFiles(GOOD, async (dir) => {
    const config = await fast(() => cli(['p', '--config', '/dev/zero'], dir));
    assert.equal(config.code, 2);
    assert.match(config.err, /is not a regular file/);
    const input = await fast(() => cli(['/dev/zero'], dir));
    assert.equal(input.code, 2);
    assert.match(input.err, /is not a regular file|not a kind of file/);
  });
});

test('hostile: a file or a folder that cannot be opened stops the run with its reason, and is never passed over', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows does not take away read access with chmod');
    return;
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('the root user can read a file without read access');
    return;
  }
  await withFiles({ 'A.java': BAD, 'x/B.java': BAD, 'x/locked/C.java': BAD }, async (dir) => {
    await chmod(resolve(dir, 'A.java'), 0o000);
    await chmod(resolve(dir, 'x/locked'), 0o000);
    try {
      const r = await cli(['A.java'], dir);
      assert.equal(r.code, 2);
      assert.match(r.err, /A\.java: cannot be read \(EACCES\)/);
      const folder = await cli(['x'], dir);
      assert.equal(folder.code, 2);
      assert.match(folder.err, /x\/locked: cannot be read \(EACCES\)/);
    } finally {
      await chmod(resolve(dir, 'A.java'), 0o644);
      await chmod(resolve(dir, 'x/locked'), 0o755);
    }
  });
});
