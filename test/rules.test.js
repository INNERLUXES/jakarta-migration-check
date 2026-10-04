import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, atOrAbove, decide, ruleById } from '../src/index.js';
import { columnOf, configOf, findingsOf, java, kotlin, lineOf, reportOf, rulesOf, rulesOfJava, rulesOfKotlin } from './helpers.js';

// Every rule, with a near miss on each side: the form that is reported and the form next to it that is not.

test('rules: seven rules with unique ids and keys, and the levels they start at', () => {
  assert.deepEqual(RULES.map((r) => `${r.id} ${configOf().rules[r.key]}`), ['javax-import error', 'javax-qualified-name error', 'partly-moved-import warning', 'javax-artifact error', 'old-descriptor-namespace warning', 'javax-name-in-text warning', 'javax-service-file warning']);
  assert.equal(ruleById('javax-import').key, 'javaxImport');
  assert.equal(ruleById('none'), undefined);
});

test('javax-import: a single-type import that moved is an error with its replacement, on the line and column of the name', () => {
  const files = java('import javax.servlet.http.HttpServlet;', 'class A {}');
  const [f] = findingsOf(reportOf(files));
  assert.equal(f.rule, 'javax-import');
  assert.equal(f.level, 'error');
  assert.equal(f.found, 'import javax.servlet.http.HttpServlet: moved to jakarta.servlet.http.HttpServlet (Jakarta Servlet 5.0)');
  assert.equal(f.line, lineOf(files['src/A.java'], 'import javax'));
  assert.equal(f.column, columnOf(files['src/A.java'], 'javax.servlet'));
  assert.deepEqual({ from: f.from, to: f.to, spec: f.spec.url }, { from: 'javax.servlet', to: 'jakarta.servlet', spec: 'https://jakarta.ee/specifications/servlet/5.0/' });
});

test('javax-import: on-demand and static imports, and the already migrated import next to them', () => {
  assert.deepEqual(rulesOfJava('import javax.persistence.*;'), ['javax-import']);
  assert.match(reportOf(java('import javax.persistence.*;')).findings[0].found, /moved to jakarta\.persistence\.\* /);
  const r = reportOf(java('import static javax.persistence.CascadeType.ALL;', 'import static java.util.Objects.requireNonNull;'));
  assert.deepEqual(rulesOf(r), ['javax-import']);
  assert.match(r.findings[0].found, /^import static javax\.persistence\.CascadeType\.ALL: moved to jakarta\.persistence\.CascadeType\.ALL/);
  assert.deepEqual(rulesOfJava('import jakarta.persistence.*;', 'import jakarta.servlet.http.HttpServlet;'), []);
});

test('javax-import: an import spread over lines and comments is read as one name', () => {
  assert.deepEqual(rulesOfJava('import javax . /* x */ servlet', '  .Filter;'), ['javax-import']);
});

test('javax-import: Kotlin imports, with as and with .*, and a Kotlin import of the JDK', () => {
  assert.deepEqual(rulesOfKotlin('import javax.inject.Inject', 'import javax.ws.rs.core.MediaType as Media', 'import javax.ws.rs.*', 'import javax.crypto.Cipher'), ['javax-import', 'javax-import', 'javax-import']);
  assert.deepEqual(rulesOfKotlin('import jakarta.inject.Inject'), []);
});

test('javax-import: a word import that is not a declaration is not read as one', () => {
  // In Java a declaration follows a semicolon or a brace; in Kotlin it starts a line.
  assert.deepEqual(rulesOfJava('class A { void f() { x.import(javax); } }'), []);
  assert.deepEqual(rulesOfKotlin('val y = a.import', 'fun f(import: Int) = import'), []);
});

test('javax-import: the package declaration of a file is not an import, even in a javax package', () => {
  assert.deepEqual(rulesOf(reportOf({ 'src/A.java': 'package javax.servlet.custom;\nclass A {}\n' })), []);
  assert.deepEqual(rulesOf(reportOf({ 'src/A.kt': 'package javax.servlet.custom\nclass A\n' })), []);
});

test('javax-import: a name in a comment, in Javadoc or in a nested Kotlin comment is never reported', () => {
  assert.deepEqual(rulesOfJava('// import javax.servlet.Filter;', '/* import javax.servlet.Filter; */', '/** {@link javax.persistence.Entity} */', 'class A {}'), []);
  assert.deepEqual(rulesOfKotlin('/* a /* import javax.servlet.Filter */ b */', 'class A'), []);
});

test('javax-qualified-name: a fully qualified name in the code is an error; one after a dot or in a string is not this rule', () => {
  const files = java('class A {', '  @javax.persistence.Id Long id;', '  javax.servlet.http.HttpServletRequest req;', '}');
  const r = reportOf(files);
  assert.deepEqual(rulesOf(r), ['javax-qualified-name', 'javax-qualified-name']);
  assert.equal(r.findings[0].found, 'javax.persistence.Id is written out in full: moved to jakarta.persistence.Id (Jakarta Persistence 3.0)');
  assert.equal(r.findings[0].line, lineOf(files['src/A.java'], '@javax'));
  assert.equal(r.findings[0].column, columnOf(files['src/A.java'], 'javax.persistence'));
  assert.deepEqual(rulesOfJava('class A { Object o = com.javax.servlet.Filter.X; Object p = javax; }'), []);
  assert.deepEqual(rulesOfJava('class A { String s = "javax.servlet.Filter"; }'), ['javax-name-in-text']);
});

test('javax-qualified-name: a member reached through a moved class, and the code of a Kotlin template', () => {
  const r = reportOf(java('class A { Object x = javax.persistence.Persistence.createEntityManagerFactory("u"); }'));
  assert.match(r.findings[0].found, /^javax\.persistence\.Persistence\.createEntityManagerFactory is written out in full: moved to jakarta\.persistence\.Persistence\.createEntityManagerFactory/);
  assert.deepEqual(rulesOfKotlin('val t = "type ${javax.ws.rs.core.MediaType.TEXT_PLAIN}"'), ['javax-qualified-name']);
});

test('partly-moved-import: import javax.annotation.* is a warning that names the classes that moved', () => {
  const r = reportOf(java('import javax.annotation.*;'));
  assert.deepEqual(rulesOf(r), ['partly-moved-import']);
  assert.equal(r.findings[0].level, 'warning');
  assert.match(r.findings[0].found, /^import javax\.annotation\.\*: only 7 classes of javax\.annotation moved, PostConstruct, PreDestroy, Resource and 4 more, to jakarta\.annotation \(Jakarta Annotations 2\.0\)/);
  assert.deepEqual(rulesOfKotlin('import javax.annotation.*'), ['partly-moved-import']);
});

test('partly-moved-import: a class of javax.annotation that moved is an import error, one that stayed is nothing', () => {
  assert.deepEqual(rulesOfJava('import javax.annotation.PostConstruct;', 'import javax.annotation.Nonnull;', 'import javax.annotation.processing.Processor;', 'import javax.annotation.security.RolesAllowed;'), ['javax-import', 'javax-import']);
  assert.deepEqual(rulesOfJava('import javax.annotation.processing.*;', 'import javax.annotation.security.*;'), ['javax-import']);
});

test('javax-artifact: a pom.xml dependency, in dependencyManagement and in a plugin, with its replacement on the artifactId line', () => {
  const pom = ['<project>', '  <dependencyManagement><dependencies>', '    <dependency>', '      <groupId>javax.ws.rs</groupId>', '      <artifactId>javax.ws.rs-api</artifactId>', '    </dependency>', '  </dependencies></dependencyManagement>', '  <build><plugins><plugin><artifactId>p</artifactId><dependencies>', '    <dependency><groupId>javax.xml.bind</groupId><artifactId>jaxb-api</artifactId></dependency>', '  </dependencies></plugin></plugins></build>', '</project>', ''].join('\n');
  const r = reportOf({ 'pom.xml': pom });
  assert.deepEqual(rulesOf(r), ['javax-artifact', 'javax-artifact']);
  assert.equal(r.findings[0].found, 'javax.ws.rs:javax.ws.rs-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.ws.rs:jakarta.ws.rs-api (Jakarta RESTful Web Services 3.0)');
  assert.equal(r.findings[0].line, lineOf(pom, '<artifactId>javax.ws.rs-api'));
  assert.equal(r.findings[1].line, lineOf(pom, '<groupId>javax.xml.bind'));
  assert.equal(r.findings[0].from, 'javax.ws.rs');
});

test('javax-artifact: an exclusion, a jakarta artifact, a property and an implementation are not reported', () => {
  const pom = '<project><dependencies><dependency><groupId>com.example</groupId><artifactId>lib</artifactId><exclusions><exclusion><groupId>javax.servlet</groupId><artifactId>servlet-api</artifactId></exclusion></exclusions></dependency><dependency><groupId>jakarta.servlet</groupId><artifactId>jakarta.servlet-api</artifactId></dependency><dependency><groupId>${ee.group}</groupId><artifactId>javax.servlet-api</artifactId></dependency><dependency><groupId>com.sun.mail</groupId><artifactId>javax.mail</artifactId></dependency></dependencies></project>';
  const r = reportOf({ 'pom.xml': pom });
  assert.deepEqual(rulesOf(r), []);
  assert.equal(r.summary.counts.dependencies, 3);
});

test('javax-artifact: the platform artifacts of Java EE name the platform of Jakarta EE 9', () => {
  const r = reportOf({ 'pom.xml': '<project><dependencies><dependency><groupId>javax</groupId><artifactId>javaee-api</artifactId></dependency><dependency><groupId>javax</groupId><artifactId>javaee-web-api</artifactId></dependency></dependencies></project>' });
  assert.deepEqual(r.findings.map((f) => f.found.split('; ')[1]), ['Jakarta EE 9 and later name jakarta.platform:jakarta.jakartaee-api (Jakarta EE Platform 9)', 'Jakarta EE 9 and later name jakarta.platform:jakarta.jakartaee-web-api (Jakarta EE Web Profile 9)']);
  assert.deepEqual(r.findings.map((f) => f.from), ['javax', 'javax']);
});

test('javax-artifact: Gradle strings and named values in the Groovy and the Kotlin DSL', () => {
  const groovy = ["dependencies {", "  implementation 'javax.servlet:javax.servlet-api:4.0.1'", "  compileOnly group: 'javax.inject', name: 'javax.inject', version: '1'", "  implementation 'jakarta.inject:jakarta.inject-api:2.0.1'", "}", ''].join('\n');
  const kts = ['dependencies {', '    implementation("javax.persistence:javax.persistence-api:2.2")', '    compileOnly(group = "javax.validation", name = "validation-api", version = "2.0.1.Final")', '}', ''].join('\n');
  const r = reportOf({ 'build.gradle': groovy, 'm/build.gradle.kts': kts });
  assert.deepEqual(r.findings.map((f) => `${f.file}:${f.line} ${f.found.split(' ')[0]}`), [
    `build.gradle:${lineOf(groovy, 'javax.servlet:')} javax.servlet:javax.servlet-api`,
    `build.gradle:${lineOf(groovy, 'javax.inject')} javax.inject:javax.inject`,
    `m/build.gradle.kts:${lineOf(kts, 'javax.persistence')} javax.persistence:javax.persistence-api`,
    `m/build.gradle.kts:${lineOf(kts, 'javax.validation')} javax.validation:validation-api`
  ]);
});

test('javax-artifact: Gradle comments, exclusions and substitutions are not dependencies', () => {
  const text = ["// implementation 'javax.servlet:javax.servlet-api:4.0.1'", "/* implementation 'javax.jms:javax.jms-api:2.0.1'", "   implementation 'javax.mail:mail:1.4' */", "configurations.all { exclude group: 'javax.servlet', module: 'servlet-api' }", "exclude(group = \"javax.inject\", name = \"javax.inject\")", "substitute module('javax.servlet:servlet-api') using module('jakarta.servlet:jakarta.servlet-api:5.0.0')", "implementation 'org.example:lib:1.0' // 'javax.el:el-api:2.2'", ''].join('\n');
  assert.deepEqual(rulesOf(reportOf({ 'build.gradle': text })), []);
});

test('javax-artifact: a version catalog with module, with group and name, and a comment', () => {
  const toml = ['[libraries]', 'jaxb = { module = "javax.xml.bind:jaxb-api", version = "2.3.1" }', 'jms = { group = "javax.jms", name = "javax.jms-api", version.ref = "jms" }', '# old = { module = "javax.mail:mail" }', 'ok = { module = "jakarta.jms:jakarta.jms-api", version = "3.1.0" }', ''].join('\n');
  const r = reportOf({ 'gradle/libs.versions.toml': toml });
  assert.deepEqual(r.findings.map((f) => f.line), [lineOf(toml, 'jaxb ='), lineOf(toml, 'jms =')]);
});

test('old-descriptor-namespace: each namespace of Java EE and J2EE is a warning with the namespace that replaced it', () => {
  for (const [file, ns, to] of [
    ['web.xml', 'http://xmlns.jcp.org/xml/ns/javaee', 'https://jakarta.ee/xml/ns/jakartaee'],
    ['beans.xml', 'http://java.sun.com/xml/ns/javaee', 'https://jakarta.ee/xml/ns/jakartaee'],
    ['ejb-jar.xml', 'http://java.sun.com/xml/ns/j2ee', 'https://jakarta.ee/xml/ns/jakartaee'],
    ['persistence.xml', 'http://xmlns.jcp.org/xml/ns/persistence', 'https://jakarta.ee/xml/ns/persistence'],
    ['orm.xml', 'http://java.sun.com/xml/ns/persistence/orm', 'https://jakarta.ee/xml/ns/persistence/orm'],
    ['validation.xml', 'http://jboss.org/xml/ns/javax/validation/configuration', 'https://jakarta.ee/xml/ns/validation/configuration']
  ]) {
    const text = `<?xml version="1.0"?>\n<root\n  xmlns="${ns}" version="1">\n</root>\n`;
    const r = reportOf({ [`x/${file}`]: text });
    assert.deepEqual(rulesOf(r), ['old-descriptor-namespace'], file);
    assert.equal(r.findings[0].level, 'warning');
    assert.equal(r.findings[0].line, 3);
    assert.equal(r.findings[0].found, `xmlns="${ns}" is a namespace of the descriptors before Jakarta EE 9; Jakarta EE 9 and later use ${to}, with the schema location and the version that go with it`);
  }
});

test('old-descriptor-namespace: a prefixed namespace is reported; the jakarta namespace and the schema location are not', () => {
  assert.deepEqual(rulesOf(reportOf({ 'faces-config.xml': '<f:faces-config xmlns:f="http://xmlns.jcp.org/xml/ns/javaee/"/>' })), ['old-descriptor-namespace']);
  const ok = '<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee" xmlns:xsi="urn:example:instance" xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee x.xsd"/>';
  assert.deepEqual(rulesOf(reportOf({ 'web.xml': ok })), []);
});

test('javax-name-in-text: a string naming a moved class is a warning, with slashes read as dots; JDK and unknown names are not', () => {
  const r = reportOf(java('class A {', '  String a = "javax.ws.rs.core.Application";', '  String b = "javax/servlet/http/HttpServlet.class";', '  String c = "javax.crypto.Cipher";', '  String d = "see javax.cache.Cache";', '  String e = "jakarta.servlet.Filter";', '  String f = "xjavax.servlet.Filter";', '}'));
  assert.deepEqual(rulesOf(r), ['javax-name-in-text', 'javax-name-in-text']);
  assert.equal(r.findings[0].level, 'warning');
  assert.match(r.findings[0].found, /^the string "javax\.ws\.rs\.core\.Application" names javax\.ws\.rs\.core\.Application, which moved to jakarta\.ws\.rs\.core\.Application/);
  assert.match(r.findings[1].found, /names javax\.servlet\.http\.HttpServlet\.class, which moved to jakarta\.servlet\.http\.HttpServlet\.class/);
});

test('javax-name-in-text: a long string is cut in the message, and two names in one string are two findings', () => {
  const long = `javax.persistence.lock.timeout ${'x'.repeat(200)}`;
  const r = reportOf(java(`class A { String s = "${long}"; String t = "javax.servlet.A javax.servlet.B"; }`));
  assert.equal(r.findings.length, 3);
  assert.ok(r.findings[0].found.includes('x...'));
});

test('javax-name-in-text: text blocks and Kotlin raw strings, with the template code read apart', () => {
  assert.deepEqual(rulesOfJava('class A { String s = """', '  javax.persistence.jdbc.url', '  """; }'), ['javax-name-in-text']);
  assert.deepEqual(rulesOfKotlin('val s = """javax.faces.PROJECT_STAGE ${n}"""'), ['javax-name-in-text']);
});

test('javax-name-in-text: values and attributes of a descriptor, but not its schema location', () => {
  const text = ['<persistence xmlns="https://jakarta.ee/xml/ns/persistence">', '  <persistence-unit name="u">', '    <provider>org.example.Provider</provider>', '    <properties>', '      <property name="javax.persistence.jdbc.url" value="jdbc:x"/>', '      <property name="javax.persistence.schema-generation.database.action" value="none"/>', '    </properties>', '  </persistence-unit>', '</persistence>', ''].join('\n');
  const r = reportOf({ 'META-INF/persistence.xml': text });
  assert.deepEqual(r.findings.map((f) => f.line), [lineOf(text, 'jdbc.url'), lineOf(text, 'schema-generation')]);
  assert.match(r.findings[0].found, /^the attribute name="javax\.persistence\.jdbc\.url" of <property> names javax\.persistence\.jdbc\.url/);
  const web = '<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee">\n<context-param>\n<param-name>\n  javax.faces.PROJECT_STAGE\n</param-name></context-param></web-app>';
  const w = reportOf({ 'web.xml': web });
  assert.equal(w.findings[0].line, 4);
  assert.match(w.findings[0].found, /^the value "javax\.faces\.PROJECT_STAGE" of <param-name>/);
  assert.deepEqual(rulesOf(reportOf({ 'web.xml': '<web-app><![CDATA[javax.servlet.Filter]]></web-app>' })), ['javax-name-in-text']);
  assert.deepEqual(rulesOf(reportOf({ 'web.xml': '<web-app><!-- javax.servlet.Filter --></web-app>' })), []);
});

test('javax-service-file: a service file named for a moved interface, and a provider line that moved', () => {
  const r = reportOf({ 'src/main/resources/META-INF/services/javax.ws.rs.ext.RuntimeDelegate': '# providers\norg.example.Delegate # the default\n', 'META-INF/services/org.example.Spi': 'javax.json.spi.JsonProvider\n\n  javax.crypto.Thing  \n' });
  assert.deepEqual(r.findings.map((f) => `${f.rule} ${f.line}`), ['javax-service-file 1', 'javax-service-file 1']);
  assert.match(r.findings[0].found, /^the service file is named for javax\.ws\.rs\.ext\.RuntimeDelegate, which moved to jakarta\.ws\.rs\.ext\.RuntimeDelegate .+ renamed to jakarta\.ws\.rs\.ext\.RuntimeDelegate$/);
  assert.match(r.findings[1].found, /^the provider javax\.json\.spi\.JsonProvider moved to jakarta\.json\.spi\.JsonProvider/);
  assert.deepEqual(rulesOf(reportOf({ 'META-INF/services/jakarta.ws.rs.ext.RuntimeDelegate': 'org.example.Delegate\n' })), []);
});

test('rules: a rule set to off is not reported and is named in a note; a rule raised to error fails the run', () => {
  const files = java('import javax.annotation.*;', 'import javax.servlet.Filter;');
  const off = reportOf(files, { rules: { javaxImport: 'off' } });
  assert.deepEqual(rulesOf(off), ['partly-moved-import']);
  assert.ok(off.notes.includes('1 rule is off: javax-import'));
  assert.equal(off.result.pass, true);
  const raised = reportOf(files, { rules: { partlyMovedImport: 'error', javaxImport: 'notice' } });
  assert.deepEqual(raised.findings.map((f) => `${f.rule} ${f.level}`), ['partly-moved-import error', 'javax-import notice']);
  assert.equal(raised.result.pass, false);
});

test('rules: added moves and ignored names of the configuration', () => {
  const files = java('import javax.cache.Cache;', 'import javax.servlet.Filter;', 'class A { String s = "javax.servlet.Filter"; }');
  assert.deepEqual(rulesOf(reportOf(files, { packages: { 'javax.cache': 'jakarta.cache' } })), ['javax-import', 'javax-import', 'javax-name-in-text']);
  const ignored = reportOf(files, { ignore: ['javax.servlet'] });
  assert.deepEqual(rulesOf(ignored), []);
  assert.equal(ignored.summary.seen.imports.ignored, 1);
  assert.match(reportOf(files, { packages: { 'javax.cache': 'jakarta.cache' } }).findings[0].found, /moved to jakarta\.cache\.Cache \(the packages key of the configuration\)/);
});

test('rules: the result fails on an error only, and levels compare in order', () => {
  assert.deepEqual(decide([{ level: 'warning' }, { level: 'notice' }]), { pass: true, errors: 0, byLevel: { error: 0, warning: 1, notice: 1 }, text: 'PASS - no error (1 warning, 1 notice)' });
  assert.equal(decide([{ level: 'error' }, { level: 'error' }, { level: 'warning' }]).text, 'FAIL - 2 errors (and 1 warning)');
  assert.equal(decide([]).text, 'PASS - no error');
  assert.equal(atOrAbove('error', 'warning'), true);
  assert.equal(atOrAbove('notice', 'warning'), false);
});

test('rules: findings are sorted errors first, then by file, line and column', () => {
  const r = reportOf({ ...java('class A { String s = "javax.servlet.A"; javax.servlet.B b; }'), ...kotlin('import javax.inject.Inject') });
  assert.deepEqual(r.findings.map((f) => `${f.level} ${f.file}:${f.line}:${f.column}`), ['error src/A.java:3:41', 'error src/A.kt:3:8', 'warning src/A.java:3:22']);
});

test('rules: a report states the summary per package, most findings first', () => {
  const r = reportOf({ ...java('import javax.servlet.A;', 'import javax.servlet.B;', 'import javax.inject.Inject;'), 'web.xml': '<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"/>' });
  assert.deepEqual(r.summary.packages, [
    { from: 'javax.servlet', to: 'jakarta.servlet', findings: 2, files: 1, rules: { 'javax-import': 2 } },
    { from: 'http://xmlns.jcp.org/xml/ns/javaee', to: 'https://jakarta.ee/xml/ns/jakartaee', findings: 1, files: 1, rules: { 'old-descriptor-namespace': 1 } },
    { from: 'javax.inject', to: 'jakarta.inject', findings: 1, files: 1, rules: { 'javax-import': 1 } }
  ]);
});
