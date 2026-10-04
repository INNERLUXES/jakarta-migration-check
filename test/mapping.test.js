import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACTS, JDK, MOVED, MOVED_CLASSES, NAMESPACES, PARTLY_MOVED, SOURCES, SPECS, artifactOf, lookupName, namespaceOf, spec, specPackage, startsAt } from '../src/index.js';
import { reportOf, rulesOf } from './helpers.js';

// The mapping of src/mapping.js: the data itself, the lookup by the longest prefix, and the proof that the javax
// packages of the JDK are never reported, whatever form they take.

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');

// Every javax package of the Java SE API (the list of all packages of Java SE 21), written out one by one.
const JDK_PACKAGES = [
  'javax.accessibility', 'javax.annotation.processing', 'javax.crypto', 'javax.crypto.interfaces', 'javax.crypto.spec', 'javax.imageio', 'javax.imageio.event', 'javax.imageio.metadata',
  'javax.imageio.plugins.bmp', 'javax.imageio.plugins.jpeg', 'javax.imageio.plugins.tiff', 'javax.imageio.spi', 'javax.imageio.stream', 'javax.lang.model', 'javax.lang.model.element',
  'javax.lang.model.type', 'javax.lang.model.util', 'javax.management', 'javax.management.loading', 'javax.management.modelmbean', 'javax.management.monitor', 'javax.management.openmbean',
  'javax.management.relation', 'javax.management.remote', 'javax.management.remote.rmi', 'javax.management.timer', 'javax.naming', 'javax.naming.directory', 'javax.naming.event',
  'javax.naming.ldap', 'javax.naming.ldap.spi', 'javax.naming.spi', 'javax.net', 'javax.net.ssl', 'javax.print', 'javax.print.attribute', 'javax.print.attribute.standard', 'javax.print.event',
  'javax.rmi.ssl', 'javax.script', 'javax.security.auth', 'javax.security.auth.callback', 'javax.security.auth.kerberos', 'javax.security.auth.login', 'javax.security.auth.spi',
  'javax.security.cert', 'javax.security.sasl', 'javax.smartcardio', 'javax.sound.midi', 'javax.sound.midi.spi', 'javax.sound.sampled', 'javax.sound.sampled.spi', 'javax.sql',
  'javax.sql.rowset', 'javax.sql.rowset.serial', 'javax.sql.rowset.spi', 'javax.swing', 'javax.swing.border', 'javax.swing.colorchooser', 'javax.swing.event', 'javax.swing.filechooser',
  'javax.swing.plaf', 'javax.swing.plaf.basic', 'javax.swing.plaf.metal', 'javax.swing.plaf.multi', 'javax.swing.plaf.nimbus', 'javax.swing.plaf.synth', 'javax.swing.table',
  'javax.swing.text', 'javax.swing.text.html', 'javax.swing.text.html.parser', 'javax.swing.text.rtf', 'javax.swing.tree', 'javax.swing.undo', 'javax.tools', 'javax.transaction.xa',
  'javax.xml', 'javax.xml.catalog', 'javax.xml.crypto', 'javax.xml.crypto.dom', 'javax.xml.crypto.dsig', 'javax.xml.crypto.dsig.dom', 'javax.xml.crypto.dsig.keyinfo',
  'javax.xml.crypto.dsig.spec', 'javax.xml.datatype', 'javax.xml.namespace', 'javax.xml.parsers', 'javax.xml.stream', 'javax.xml.stream.events', 'javax.xml.stream.util',
  'javax.xml.transform', 'javax.xml.transform.dom', 'javax.xml.transform.sax', 'javax.xml.transform.stax', 'javax.xml.transform.stream', 'javax.xml.validation', 'javax.xml.xpath'
];

test('mapping: every entry names a specification of the list, and no name is listed twice', () => {
  const ids = new Set(SPECS.map((s) => s.id));
  assert.equal(ids.size, SPECS.length);
  for (const s of SPECS) assert.match(s.url, /^https:\/\/jakarta\.ee\/specifications\/[a-z-]+\/[0-9.]+\/$/, s.id);
  for (const m of [...MOVED, ...MOVED_CLASSES, ...ARTIFACTS, ...PARTLY_MOVED]) assert.ok(ids.has(m.spec), `${m.from ?? m.package}: ${m.spec}`);
  for (const list of [MOVED.map((m) => m.from), MOVED_CLASSES.map((m) => m.from), JDK.map((j) => j.name), ARTIFACTS.map((a) => a.from), NAMESPACES.map((n) => n.from)]) assert.equal(new Set(list).size, list.length);
  for (const s of SPECS) assert.ok([...MOVED, ...MOVED_CLASSES, ...ARTIFACTS].some((m) => m.spec === s.id), `${s.id} is used`);
  assert.equal(spec('servlet').title, 'Jakarta Servlet 5.0');
  assert.equal(spec('none'), undefined);
});

test('mapping: every move goes from javax to the same name under jakarta, and every artifact to a jakarta group', () => {
  for (const m of [...MOVED, ...MOVED_CLASSES]) assert.equal(m.to, `jakarta${m.from.slice('javax'.length)}`, m.from);
  for (const a of ARTIFACTS) {
    assert.match(a.from, /^(?:javax[a-z.]*|javax):[a-z0-9.-]+$/, a.from);
    assert.match(a.to, /^jakarta\.[a-z.]+:jakarta\.[a-z.-]+$/, a.to);
  }
  for (const n of NAMESPACES) {
    assert.match(n.from, /^http:\/\/(?:java\.sun\.com|xmlns\.jcp\.org|jboss\.org)\/xml\/ns\//, n.from);
    assert.match(n.to, /^https:\/\/jakarta\.ee\/xml\/ns\//, n.to);
    assert.ok(SOURCES.some((s) => s.id === n.source), n.source);
  }
});

test('mapping: where a moved prefix and a JDK prefix hold one another, the longer one is known, so the longest prefix decides', () => {
  // A moved prefix that holds a package of the JDK: the JDK package is longer, so its names stay.
  assert.deepEqual(MOVED.flatMap((m) => JDK.filter((j) => startsAt(j.name, m.from)).map((j) => `${m.from} > ${j.name}`)), ['javax.transaction > javax.transaction.xa']);
  // A JDK prefix that holds a moved package: the moved package is longer, so its names move.
  assert.deepEqual(MOVED.filter((m) => JDK.some((j) => startsAt(m.from, j.name))).map((m) => m.from).sort(), ['javax.security.auth.message', 'javax.xml.bind', 'javax.xml.soap', 'javax.xml.ws']);
  assert.ok(JDK.some((j) => startsAt(j.name, PARTLY_MOVED[0].package)), 'javax.annotation.processing sits inside the partly moved javax.annotation');
});

test('mapping: every javax package of the Java SE API is found as a package of the JDK', () => {
  for (const p of JDK_PACKAGES) {
    const r = lookupName(`${p}.SomeClass`);
    assert.equal(r.kind, 'jdk', p);
  }
  assert.equal(lookupName('javax.annotation.processing.Processor').kind, 'jdk', 'the annotation processing of the JDK is not Jakarta Annotations');
});

test('mapping: no import, qualified name, string, service line or wildcard of a JDK package is ever reported', () => {
  const imports = JDK_PACKAGES.map((p) => `import ${p}.*;`).join('\n');
  const names = JDK_PACKAGES.map((p, i) => `  ${p}.Thing f${i};`).join('\n');
  const texts = JDK_PACKAGES.map((p, i) => `  String s${i} = "${p}.Thing";`).join('\n');
  const kt = JDK_PACKAGES.map((p) => `import ${p}.Thing`).join('\n');
  const r = reportOf({
    'src/A.java': `package a;\n${imports}\nimport static javax.transaction.xa.XAResource.TMNOFLAGS;\nclass A {\n${names}\n${texts}\n}\n`,
    'src/B.kt': `package b\n${kt}\nval s = "${JDK_PACKAGES.map((p) => `${p.split('.').join('/')}/Thing`).join(' ')}"\n`,
    'META-INF/services/javax.annotation.processing.Processor': 'com.example.Processor\njavax.xml.parsers.Thing\n',
    'web.xml': `<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"><context-param><param-name>javax.sql.DataSource</param-name><param-value>javax.naming.InitialContext</param-value></context-param></web-app>`
  });
  assert.deepEqual(rulesOf(r), []);
  assert.equal(r.summary.seen.imports.jdk, JDK_PACKAGES.length * 2 + 1);
  assert.equal(r.summary.seen.code.jdk, JDK_PACKAGES.length);
  assert.equal(r.summary.seen.texts.jdk, JDK_PACKAGES.length * 2 + 2);
});

test('mapping: the longest prefix decides where a moved package and a JDK package share a start', () => {
  assert.equal(lookupName('javax.transaction.Transactional').replacement, 'jakarta.transaction.Transactional');
  assert.equal(lookupName('javax.transaction.xa.XAResource').kind, 'jdk');
  assert.equal(lookupName('javax.security.auth.message.module.ServerAuthModule').replacement, 'jakarta.security.auth.message.module.ServerAuthModule');
  assert.equal(lookupName('javax.security.auth.Subject').kind, 'jdk');
  assert.equal(lookupName('javax.xml.bind.JAXBContext').replacement, 'jakarta.xml.bind.JAXBContext');
  assert.equal(lookupName('javax.xml.XMLConstants').kind, 'jdk');
  assert.equal(lookupName('javax.xml.ws.Service').spec, 'xmlWs');
  assert.equal(lookupName('javax.servlet.jsp.jstl.core.Config').spec, 'tags');
  assert.equal(lookupName('javax.servlet.jsp.PageContext').spec, 'pages');
  assert.equal(lookupName('javax.servlet.Filter').spec, 'servlet');
  assert.equal(lookupName('javax.json.bind.Jsonb').spec, 'jsonb');
  assert.equal(lookupName('javax.json.Json').spec, 'jsonp');
  assert.equal(lookupName('javax.enterprise.concurrent.ManagedExecutorService').spec, 'concurrency');
  assert.equal(lookupName('javax.enterprise.inject.Produces').spec, 'cdi');
});

test('mapping: javax.annotation moved only the classes of Jakarta Annotations, and its other names stay', () => {
  for (const c of PARTLY_MOVED[0].classes) assert.equal(lookupName(`javax.annotation.${c}`).replacement, `jakarta.annotation.${c}`, c);
  assert.equal(lookupName('javax.annotation.Resource.AuthenticationType').replacement, 'jakarta.annotation.Resource.AuthenticationType');
  assert.equal(lookupName('javax.annotation.security.RolesAllowed').replacement, 'jakarta.annotation.security.RolesAllowed');
  assert.equal(lookupName('javax.annotation.sql.DataSourceDefinition').replacement, 'jakarta.annotation.sql.DataSourceDefinition');
  assert.equal(lookupName('javax.annotation.Nonnull').kind, 'partly');
  assert.equal(lookupName('javax.annotation.PostConstructs').kind, 'partly', 'a prefix matches at a dot only');
  assert.equal(lookupName('javax.annotation').kind, 'partly');
  assert.equal(lookupName('javax.annotation.PostConstruct').group, 'javax.annotation');
});

test('mapping: a name that is not javax, or a javax name the mapping does not know, is unknown', () => {
  for (const n of ['javax', 'java.util.List', 'jakarta.servlet.Filter', 'javaxx.servlet.Filter', 'javax.cache.Cache', 'javax.money.MonetaryAmount', null, 42]) assert.equal(lookupName(n).kind, 'unknown', String(n));
  assert.equal(lookupName('javax.servletx.Filter').kind, 'unknown');
});

test('mapping: moves added by the configuration and names it ignores, and an ignored name wins a tie', () => {
  const extra = [{ from: 'javax.cache', to: 'jakarta.cache', spec: null }];
  assert.equal(lookupName('javax.cache.Cache', { extra }).replacement, 'jakarta.cache.Cache');
  assert.equal(lookupName('javax.servlet.Filter', { ignore: ['javax.servlet'] }).kind, 'ignored');
  assert.equal(lookupName('javax.servlet.Filter', { ignore: ['javax.servlet.Filter'] }).kind, 'ignored');
  assert.equal(lookupName('javax.servlet.http.Cookie', { ignore: ['javax.servlet'] }).kind, 'ignored');
  assert.equal(lookupName('javax.servlet.jsp.PageContext', { ignore: ['javax.servlet'] }).kind, 'moved', 'a longer moved prefix still wins');
});

test('mapping: namespaces with or without a slash at the end, and artifacts by group and artifact id', () => {
  assert.equal(namespaceOf('http://xmlns.jcp.org/xml/ns/javaee/').to, 'https://jakarta.ee/xml/ns/jakartaee');
  assert.equal(namespaceOf(' http://java.sun.com/xml/ns/persistence ').to, 'https://jakarta.ee/xml/ns/persistence');
  assert.equal(namespaceOf('https://jakarta.ee/xml/ns/jakartaee'), null);
  assert.equal(namespaceOf('https://xmlns.jcp.org/xml/ns/javaee'), null, 'a namespace is compared as a string');
  assert.equal(artifactOf('javax.servlet', 'javax.servlet-api').to, 'jakarta.servlet:jakarta.servlet-api');
  assert.equal(artifactOf('jakarta.servlet', 'jakarta.servlet-api'), null);
  assert.deepEqual(specPackage('servlet'), { from: 'javax.servlet', to: 'jakarta.servlet' });
  assert.deepEqual(specPackage('annotations'), { from: 'javax.annotation', to: 'jakarta.annotation' });
  assert.deepEqual(specPackage('platform'), { from: 'javax', to: 'jakarta' });
});

test('mapping: no version is asserted; the data file names artifacts by group and artifact id only', async () => {
  const text = await read('src/mapping.js');
  for (const a of ARTIFACTS) assert.equal(a.from.split(':').length, 2, a.from);
  assert.doesNotMatch(text, /(?:from|to): '[^']*:[^']*:[^']*'/);
});

test('mapping: research/sources.md lists every specification page', async () => {
  const note = await read('research/sources.md');
  for (const s of SPECS) assert.ok(note.includes(s.url), s.url);
});
