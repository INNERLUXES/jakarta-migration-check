// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// projects to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const LEGACY = ['examples/legacy', '--config', 'examples/config.json'];
export const MIGRATED = ['examples/migrated'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the legacy project: the counts, one finding of every rule, what was read and the result.
export const EXPECTED = [
  'input: examples/legacy (11 files: 4 java, 1 kotlin, 1 maven, 1 gradle, 1 catalog, 2 descriptor, 1 service)',
  'findings: 28 (20 error, 8 warning)',
  'import javax.servlet.http.HttpServlet: moved to jakarta.servlet.http.HttpServlet (Jakarta Servlet 5.0)',
  'import static javax.persistence.LockModeType.PESSIMISTIC_WRITE: moved to jakarta.persistence.LockModeType.PESSIMISTIC_WRITE',
  'import javax.persistence.*: moved to jakarta.persistence.* (Jakarta Persistence 3.0)',
  'import javax.ws.rs.core.MediaType: moved to jakarta.ws.rs.core.MediaType',
  'javax.validation.constraints.NotNull is written out in full: moved to jakarta.validation.constraints.NotNull',
  'import javax.annotation.*: only 7 classes of javax.annotation moved, PostConstruct, PreDestroy, Resource and 4 more, to jakarta.annotation (Jakarta Annotations 2.0)',
  'javax.servlet:javax.servlet-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.servlet:jakarta.servlet-api',
  'javax.inject:javax.inject is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.inject:jakarta.inject-api',
  'javax.xml.bind:jaxb-api is a Java EE artifact',
  'xmlns="http://xmlns.jcp.org/xml/ns/javaee" is a namespace of the descriptors before Jakarta EE 9; Jakarta EE 9 and later use https://jakarta.ee/xml/ns/jakartaee',
  'xmlns="http://java.sun.com/xml/ns/persistence" is a namespace of the descriptors before Jakarta EE 9',
  'the string "javax.ws.rs.core.Application" names javax.ws.rs.core.Application, which moved to jakarta.ws.rs.core.Application',
  'the attribute name="javax.persistence.jdbc.url" of <property> names javax.persistence.jdbc.url',
  'the value "javax.faces.PROJECT_STAGE" of <param-name> names javax.faces.PROJECT_STAGE',
  'the service file is named for javax.servlet.ServletContainerInitializer, which moved to jakarta.servlet.ServletContainerInitializer',
  '  imports        26 read; javax imports 25: 13 moved, 1 of javax.annotation, not moved, 11 in the JDK',
  'RESULT: FAIL - 20 errors (and 8 warnings)'
];
// The packages of the JDK, the names in comments, the exclusion, the dependency in a comment and the class the build wrote
// that the configuration leaves out are not reported.
export const UNWANTED = ['RESULT: PASS', 'javax.crypto', 'javax.naming', 'javax.sql', 'javax.transaction.xa', 'javax.security.auth', 'javax.xml.parsers', 'javax.annotation.processing', 'javax.persistence.Table', 'javax.ws.rs.POST', 'javax.activation', 'javax.mail', 'servlet:servlet-api', 'BookDto', 'XmlElement'];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const legacy = await run(LEGACY);
  process.stdout.write(legacy.out);
  expect('legacy project', legacy, 1, EXPECTED, UNWANTED);

  const migrated = await run(MIGRATED);
  expect('migrated project', migrated, 0, ['input: examples/migrated (11 files: 4 java, 1 kotlin, 1 maven, 1 gradle, 1 catalog, 2 descriptor, 1 service)', 'findings: 0', 'RESULT: PASS - no error'], ['  WARNING  ', '  ERROR  ', '  NOTICE  ', 'RESULT: FAIL']);

  // Without the configuration the class the build wrote is read too, and its fully qualified annotation is reported.
  expect('legacy, built-in configuration', await run(['examples/legacy']), 1, ['config: built-in defaults:', 'findings: 29 (21 error, 8 warning)', 'javax.xml.bind.annotation.XmlElement is written out in full'], []);
  // One file can be named on its own, and only the errors can be shown.
  expect('legacy, one file', await run(['examples/legacy/src/main/java/com/larkspur/books/model/Book.java']), 1, ['jakarta-migration-check: examples/legacy/src/main/java/com/larkspur/books/model/Book.java', 'findings: 3 (2 error, 1 warning)'], []);
  expect('legacy, errors only', await run([...LEGACY, '--min-severity', 'error']), 1, ['findings: 20 (20 error); 8 below error not shown'], ['WARNING']);
  // A file of no kind the tool reads stops the run.
  expect('legacy, a README named', await run(['examples/legacy/README.md']), 2, ['examples/legacy/README.md: not a kind of file the tool reads'], [], 'err');

  // The README shows the whole report of the legacy project, the --explain lines of one finding, the GitHub
  // annotations of the servlet, the table of --summary and the report of the migrated project.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  if (!readme.includes(legacy.out)) problems.push('README: the sample output of the legacy project differs from a real run');
  if (!readme.includes(migrated.out)) problems.push('README: the sample output of the migrated project differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/legacy.txt'), legacy.out);
  await writeFile(resolve(root, 'examples/output/migrated.txt'), migrated.out);
  const explain = await run([...LEGACY, '--explain']);
  if (explain.code !== 1) problems.push(`explain: exit code ${explain.code}, expected 1`);
  const lines = explain.out.split('\n');
  const at = lines.findIndex((l) => l.includes('javax-qualified-name') && l.includes('Book.java:15'));
  const sample = lines.slice(at, at + 8).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the --explain sample of the fully qualified name differs from a real run');
  await writeFile(resolve(root, 'examples/output/legacy-explain.txt'), explain.out);
  const summary = await run([...LEGACY, '--summary']);
  if (summary.code !== 1) problems.push(`summary: exit code ${summary.code}, expected 1`);
  const table = summary.out.slice(summary.out.indexOf('Per package'), summary.out.indexOf('Read: '));
  if (!table.includes('javax.servlet') || !readme.includes(table.trimEnd())) problems.push('README: the --summary sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/legacy-summary.txt'), summary.out);
  const github = await run([...LEGACY, '--format', 'github']);
  if (github.code !== 1) problems.push(`github: exit code ${github.code}, expected 1`);
  const servlet = github.out.split('\n').filter((x) => x.includes('OrderServlet.java,line=9,') || x.includes('pom.xml,line=12,'));
  if (servlet.length !== 2) problems.push('github: the sample lines are not in the output');
  for (const l of servlet) if (!readme.includes(l)) problems.push('README: the GitHub sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/legacy-github.txt'), github.out);
  const json = await run([...LEGACY, '--json', '--explain']);
  if (json.code !== 1) problems.push(`json: exit code ${json.code}, expected 1`);
  await writeFile(resolve(root, 'examples/output/legacy.json'), json.out);
  const defaults = await run(['--print-defaults']);
  if (defaults.code !== 0) problems.push(`--print-defaults: exit code ${defaults.code}, expected 0`);
  await writeFile(resolve(root, 'examples/output/defaults.json'), defaults.out);

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
