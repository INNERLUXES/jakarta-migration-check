import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED, LEGACY, MIGRATED, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');

test('examples: the legacy project fails with the report that is saved in examples/output', async () => {
  const r = await run(LEGACY);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('legacy.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the migrated project passes with the report that is saved', async () => {
  const r = await run(MIGRATED);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('migrated.txt'));
  assert.match(r.out, /\nfindings: 0\n/);
});

test('examples: --explain, --summary, JSON, the GitHub commands and the defaults are the reports that are saved', async () => {
  assert.equal((await run([...LEGACY, '--explain'])).out, await saved('legacy-explain.txt'));
  assert.equal((await run([...LEGACY, '--summary'])).out, await saved('legacy-summary.txt'));
  assert.equal((await run([...LEGACY, '--json', '--explain'])).out, await saved('legacy.json'));
  assert.equal((await run([...LEGACY, '--format', 'github'])).out, await saved('legacy-github.txt'));
  assert.equal((await run(['--print-defaults'])).out, await saved('defaults.json'));
});

test('examples: the rules that fire on the legacy project, each on the line built for it', async () => {
  const report = JSON.parse((await run([...LEGACY, '--json'])).out);
  const byRule = {};
  for (const f of report.findings) (byRule[f.rule] ??= []).push(f.at.replace('examples/legacy/', ''));
  // The place of the first line of a file that holds needle.
  const at = async (rel, needle) => {
    const lines = (await readFile(resolve(root, 'examples/legacy', rel), 'utf8')).split('\n');
    return `${rel}:${lines.findIndex((l) => l.includes(needle)) + 1}`;
  };
  const java = 'src/main/java/com/larkspur/books';
  const kt = 'reports/src/main/kotlin/com/larkspur/reports/ReportResource.kt';
  const servlet = `${java}/web/OrderServlet.java`;
  assert.deepEqual(byRule, {
    'javax-artifact': [await at('gradle/libs.versions.toml', 'jaxb-api'), await at('pom.xml', 'javax.servlet-api'), await at('pom.xml', 'javax.persistence-api'), await at('pom.xml', 'validation-api'), await at('reports/build.gradle', 'javax.ws.rs-api'), await at('reports/build.gradle', 'compileOnly')],
    'javax-import': [await at(kt, 'javax.inject.Inject'), await at(kt, 'javax.ws.rs.GET'), await at(kt, 'javax.ws.rs.Path'), await at(kt, 'MediaType'), await at(`${java}/AppConfig.java`, 'import static'), await at(`${java}/AppConfig.java`, 'Transactional;'), await at(`${java}/model/Book.java`, 'import javax.persistence'), await at(servlet, 'PostConstruct;'), await at(servlet, 'ServletException;'), await at(servlet, 'WebServlet;'), await at(servlet, 'HttpServlet;'), await at(servlet, 'HttpServletRequest;'), await at(servlet, 'HttpServletResponse;')],
    'javax-qualified-name': [await at(`${java}/model/Book.java`, 'NotNull')],
    'partly-moved-import': [await at(`${java}/AppConfig.java`, 'javax.annotation.*')],
    'javax-name-in-text': [await at(`${java}/AppConfig.java`, 'forName'), await at(`${java}/model/Book.java`, 'lock.timeout'), await at('src/main/resources/META-INF/persistence.xml', 'jdbc.url'), await at('src/main/webapp/WEB-INF/web.xml', 'PROJECT_STAGE')],
    'old-descriptor-namespace': [await at('src/main/resources/META-INF/persistence.xml', 'xmlns='), await at('src/main/webapp/WEB-INF/web.xml', 'xmlns=')],
    'javax-service-file': ['src/main/resources/META-INF/services/javax.servlet.ServletContainerInitializer:1']
  });
});

test('examples: the same files written with CRLF line ends give the same output', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'jakarta-migration-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    const walk = async (sub) => {
      for (const e of await readdir(resolve(dir, sub), { withFileTypes: true })) {
        const rel = `${sub}/${e.name}`;
        if (e.isDirectory()) {
          if (e.name !== 'output') await walk(rel);
        } else if (!e.name.endsWith('.md')) {
          const t = (await readFile(resolve(dir, rel), 'utf8')).split('\r\n').join('\n');
          await writeFile(resolve(dir, rel), t.split('\n').join('\r\n'));
        }
      }
    };
    await walk('examples');
    assert.equal((await run([...LEGACY, '--explain'], dir)).out, await saved('legacy-explain.txt'));
    assert.equal((await run(MIGRATED, dir)).out, await saved('migrated.txt'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
