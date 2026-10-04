import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, ReadError, XmlError, coordinatesOf, decodeEntities, elementsOf, fileKind, gradleDependencies, javaxNamesInText, localName, mavenDependencies, parseXml, readInput, readSource, textOf, tokenize, xmlProblem } from '../src/index.js';

// The readers: the kind of a file, the names of a source, the XML reader, and the dependencies of the builds.

const lineOfOffset = (text) => (offset) => text.slice(0, offset).split('\n').length;
const source = (text, language = 'java') => readSource(tokenize(text, language), language, lineOfOffset(text));
const xmlFails = (text, pattern) => assert.throws(() => parseXml(text), (e) => e instanceof XmlError && pattern.test(e.reason), text.slice(0, 60));

test('kinds: the kind of a file from its path', () => {
  assert.deepEqual(KINDS, ['java', 'kotlin', 'maven', 'gradle', 'catalog', 'descriptor', 'service']);
  for (const [path, kind] of [
    ['src/A.java', 'java'], ['A.JAVA', 'java'], ['src/B.kt', 'kotlin'], ['scripts/x.main.kts', 'kotlin'], ['build.gradle', 'gradle'], ['m/build.gradle.kts', 'gradle'],
    ['settings.gradle.kts', 'gradle'], ['gradle/libs.versions.toml', 'catalog'], ['pom.xml', 'maven'], ['m/POM.xml', 'maven'], ['WEB-INF/web.xml', 'descriptor'],
    ['META-INF/persistence.xml', 'descriptor'], ['beans.xml', 'descriptor'], ['META-INF/services/javax.servlet.ServletContainerInitializer', 'service'],
    ['a/META-INF/services/org.example.Spi', 'service'], ['README.md', null], ['other.xml', null], ['services/x', null], ['META-INF/x', null], ['gradle.properties', null]
  ]) assert.equal(fileKind(path), kind, path);
});

test('sources: javax names in a text, with dots or slashes, at the start of a part only', () => {
  assert.deepEqual(javaxNamesInText('a javax.servlet.Filter b javax/ws/rs/GET, c xjavax.servlet.X d my.javax.servlet.Y e /javax/z/Q javax. javax'), [{ name: 'javax.servlet.Filter', index: 2 }, { name: 'javax.ws.rs.GET', index: 25 }]);
  assert.deepEqual(javaxNamesInText('"javax.persistence.jdbc.url"'), [{ name: 'javax.persistence.jdbc.url', index: 1 }]);
});

test('sources: the imports, the qualified names and the strings of a Java file', () => {
  const s = source('package javax.custom;\nimport java.util.List;\nimport static javax.persistence.CascadeType.*;\nimport javax.servlet.*;\nclass A { @javax.inject.Inject Object o = a.javax.b; String t = "javax.el.ELContext"; }');
  assert.deepEqual(s.imports.map((i) => `${i.isStatic ? 'static ' : ''}${i.name}${i.wildcard ? '.*' : ''}`), ['java.util.List', 'static javax.persistence.CascadeType.*', 'javax.servlet.*']);
  assert.deepEqual(s.names.map((n) => n.name), ['javax.inject.Inject']);
  assert.deepEqual(s.texts.map((t) => t.name), ['javax.el.ELContext']);
});

test('sources: Kotlin imports start a line; an alias is read past', () => {
  const s = source('package a\nimport javax.inject.Inject as I\nimport javax.ws.rs.*\nval import = 1\nval x = javax.ws.rs.core.MediaType.TEXT_PLAIN', 'kotlin');
  assert.deepEqual(s.imports.map((i) => i.name), ['javax.inject.Inject', 'javax.ws.rs']);
  assert.deepEqual(s.names.map((n) => n.name), ['javax.ws.rs.core.MediaType.TEXT_PLAIN']);
});

test('xml: elements, attributes, text, CDATA and entities, with the offset of each', () => {
  const root = parseXml('<?xml version="1.0"?>\n<!-- c -->\n<!DOCTYPE a [ <!ENTITY e "javax.servlet.Filter"> ]>\n<a x=\'1\' y="&lt;&amp;&#65;&#x42;&e;">t1<b/>t2<![CDATA[<c>]]><p:d>v</p:d></a>\n');
  assert.equal(root.name, 'a');
  assert.deepEqual(root.attributes.map((a) => [a.name, a.value]), [['x', '1'], ['y', '<&AB&e;']]);
  assert.deepEqual(root.children.map((c) => c.name), ['b', 'p:d']);
  assert.equal(textOf(root), 't1t2<c>');
  assert.equal(root.offset, root.offset > 0 ? root.offset : -1);
  assert.deepEqual(elementsOf(root).map((e) => `${e.element.name}<${e.parent?.name ?? ''}`), ['a<', 'b<a', 'p:d<a']);
  assert.equal(localName('xsi:schemaLocation'), 'schemaLocation');
  assert.equal(localName('web-app'), 'web-app');
});

test('xml: a declared entity is never expanded, and unknown or invalid references stay as written', () => {
  assert.equal(decodeEntities('&e; &nbsp; &#0; &#x110000; &amp;amp;'), '&e; &nbsp; &#0; &#x110000; &amp;');
});

for (const [name, text, pattern] of [
  ['a tag that is not closed', '<a x="1"', /a tag that is not closed/],
  ['an element that is not closed', '<a><b></b>', /the element <a> is not closed/],
  ['an end tag that does not match', '<a><b></a>', /the end tag <\/a> does not match <b>/],
  ['an end tag with nothing open', '<a/></b>', /an end tag <\/b> with no element open/],
  ['an attribute without quotes', '<a x=1/>', /is not in quotes/],
  ['an attribute without a value', '<a x/>', /has no value/],
  ['an attribute value that is not closed', '<a x="1/>', /is not closed/],
  ['an attribute named twice', '<a x="1" x="2"/>', /appears twice in one tag/],
  ['a comment that is not closed', '<a><!-- x</a>', /a comment that is not closed/],
  ['a CDATA section that is not closed', '<a><![CDATA[x</a>', /a CDATA section that is not closed/],
  ['a processing instruction that is not closed', '<?xml version="1.0"', /a processing instruction that is not closed/],
  ['a declaration that is not closed', '<!DOCTYPE a [', /a declaration that is not closed/],
  ['text outside the root', 'x<a/>', /text outside the root element/],
  ['two root elements', '<a/><b/>', /a second root element/],
  ['no element at all', '<!-- only -->', /no root element/],
  ['an end tag that is not closed', '<a></a', /an end tag that is not closed/],
  ['a tag with no name', '< a/>', /a name was expected/]
]) {
  test(`xml: ${name} is refused`, () => xmlFails(text, pattern));
}

test('xml: limits on depth, elements and attributes, and a problem with its line and column', () => {
  assert.throws(() => parseXml(`${'<a>'.repeat(300)}`), /nested more than 256 deep/);
  assert.throws(() => parseXml('<a><b/><b/><b/></a>', { maxElements: 3 }), /more than 3 elements/);
  assert.throws(() => parseXml('<a x="1" y="2"/>', { maxAttributes: 1 }), /more than 1 attributes/);
  const text = '<a>\n  <b>\n</a>';
  try {
    parseXml(text);
    assert.fail('not refused');
  } catch (error) {
    assert.equal(xmlProblem(error, text), 'line 3, column 1: the end tag </a> does not match <b>');
  }
});

test('builds: coordinates of a string, with up to three more parts', () => {
  assert.deepEqual(coordinatesOf('javax.servlet:javax.servlet-api'), { group: 'javax.servlet', artifact: 'javax.servlet-api' });
  assert.deepEqual(coordinatesOf(' javax.el:el-api:2.2:sources@jar '), { group: 'javax.el', artifact: 'el-api' });
  assert.deepEqual(coordinatesOf('javax.el:el-api:2.2:sources'), { group: 'javax.el', artifact: 'el-api' });
  for (const s of ['javax.servlet', 'a:b:c:d:e:f', 'a b:c', ':b', 'http://x']) assert.equal(coordinatesOf(s), null, s);
});

test('builds: the dependencies of a pom.xml, by namespace prefix too', () => {
  const root = parseXml('<m:project xmlns:m="http://maven.apache.org/POM/4.0.0"><m:dependencies><m:dependency><m:groupId> javax.jms </m:groupId><m:artifactId>javax.jms-api</m:artifactId></m:dependency><m:dependency><m:groupId>g</m:groupId></m:dependency></m:dependencies></m:project>');
  assert.deepEqual(mavenDependencies(root).map((d) => `${d.group}:${d.artifact}`), ['javax.jms:javax.jms-api']);
});

test('builds: Gradle lines with CRLF, escaped quotes and a block comment over lines', () => {
  const text = 'a "x:y:1"\r\n/* "javax.el:el-api"\r\n still */ implementation "javax.el:javax.el-api:3.0.0"\r\nb \'q\\\'x\'\r\n';
  assert.deepEqual(gradleDependencies(text).map((d) => `${d.group}:${d.artifact}@${d.offset}`), [`x:y@${text.indexOf('"x:y')}`, `javax.el:javax.el-api@${text.indexOf('"javax.el:javax')}`]);
  assert.deepEqual(gradleDependencies('x = "a:b" # "c:d"', true).map((d) => d.artifact), ['b']);
});

test('read: a file of each kind, and the problems of a source and a descriptor with their place', () => {
  assert.equal(readInput('class A {}', 'A.java', 'java').source.imports.length, 0);
  assert.equal(readInput('<project/>', 'pom.xml', 'maven').dependencies.length, 0);
  assert.equal(readInput('', 'build.gradle', 'gradle').dependencies.length, 0);
  assert.equal(readInput('<web-app/>', 'web.xml', 'descriptor').root.name, 'web-app');
  assert.deepEqual(readInput('# c\n a.B \n', 'x', 'service').lines, [{ name: 'a.B', offset: 5 }]);
  assert.throws(() => readInput('class A { String s = "x; }', 'A.java', 'java'), (e) => e instanceof ReadError && e.message === 'A.java: line 1, column 22: a string that is not closed');
  assert.throws(() => readInput('<project>', 'pom.xml', 'maven'), (e) => e.message === 'pom.xml: line 1, column 1: the element <project> is not closed');
  assert.throws(() => readInput('<a></b>', 'web.xml', 'descriptor'), ReadError);
  assert.throws(() => readInput('x', 'x.txt', null), /x\.txt: not a kind of file the tool reads/);
});
