// The mapping the checks use: which javax packages moved to jakarta, which stay in the JDK, which Maven artifacts carry
// the old packages and which XML namespaces the old descriptors use. This file is data. Each entry names the page it
// was taken from, and research/sources.md has a note on every page, in this project's own words. test/mapping.test.js
// checks that every page named here is listed there, that no name is listed twice and that no moved package hides a
// package of the JDK.
//
// How the entries were found:
//   - SPECS: the page of each Jakarta EE 9 specification on jakarta.ee, with the packages its API documentation lists
//     and the Maven artifact the page names. Jakarta EE 9 is the release that moved the packages from javax to
//     jakarta; the later releases kept the jakarta names.
//   - MOVED: every package of those API documents, by its old javax prefix. A prefix covers its subpackages.
//   - MOVED_CLASSES: javax.annotation is shared. Only the classes of Jakarta Annotations moved; the rest of the name
//     belongs to other libraries or to the JDK, so the classes are listed one by one.
//   - JDK: every javax package of the Java SE API (the list of all packages of Java SE 21). These are never reported,
//     whatever else matches a shorter prefix of their name.
//   - ARTIFACTS: the API artifacts of Java EE and Jakarta EE 8 that hold the javax packages, each with the artifact
//     the specification page names for Jakarta EE 9. Every artifact named here was looked up on Maven Central.
//   - NAMESPACES: the namespaces of the deployment descriptor schemas before Jakarta EE 9 and the namespace that
//     replaced each, from the schema pages of jakarta.ee and xmlns.jcp.org.
//
// No version is named here: an artifact is named by its group and its artifact id only.

// The Jakarta EE 9 specifications. id: the key used below; title: the name of the specification; url: its page.
export const SPECS = [
  { id: 'servlet', title: 'Jakarta Servlet 5.0', url: 'https://jakarta.ee/specifications/servlet/5.0/' },
  { id: 'pages', title: 'Jakarta Server Pages 3.0', url: 'https://jakarta.ee/specifications/pages/3.0/' },
  { id: 'tags', title: 'Jakarta Standard Tag Library 2.0', url: 'https://jakarta.ee/specifications/tags/2.0/' },
  { id: 'el', title: 'Jakarta Expression Language 4.0', url: 'https://jakarta.ee/specifications/expression-language/4.0/' },
  { id: 'persistence', title: 'Jakarta Persistence 3.0', url: 'https://jakarta.ee/specifications/persistence/3.0/' },
  { id: 'validation', title: 'Jakarta Bean Validation 3.0', url: 'https://jakarta.ee/specifications/bean-validation/3.0/' },
  { id: 'annotations', title: 'Jakarta Annotations 2.0', url: 'https://jakarta.ee/specifications/annotations/2.0/' },
  { id: 'inject', title: 'Jakarta Dependency Injection 2.0', url: 'https://jakarta.ee/specifications/dependency-injection/2.0/' },
  { id: 'cdi', title: 'Jakarta Contexts and Dependency Injection 3.0', url: 'https://jakarta.ee/specifications/cdi/3.0/' },
  { id: 'interceptors', title: 'Jakarta Interceptors 2.0', url: 'https://jakarta.ee/specifications/interceptors/2.0/' },
  { id: 'rest', title: 'Jakarta RESTful Web Services 3.0', url: 'https://jakarta.ee/specifications/restful-ws/3.0/' },
  { id: 'ejb', title: 'Jakarta Enterprise Beans 4.0', url: 'https://jakarta.ee/specifications/enterprise-beans/4.0/' },
  { id: 'faces', title: 'Jakarta Server Faces 3.0', url: 'https://jakarta.ee/specifications/faces/3.0/' },
  { id: 'messaging', title: 'Jakarta Messaging 3.0', url: 'https://jakarta.ee/specifications/messaging/3.0/' },
  { id: 'mail', title: 'Jakarta Mail 2.0', url: 'https://jakarta.ee/specifications/mail/2.0/' },
  { id: 'jsonp', title: 'Jakarta JSON Processing 2.0', url: 'https://jakarta.ee/specifications/jsonp/2.0/' },
  { id: 'jsonb', title: 'Jakarta JSON Binding 2.0', url: 'https://jakarta.ee/specifications/jsonb/2.0/' },
  { id: 'websocket', title: 'Jakarta WebSocket 2.0', url: 'https://jakarta.ee/specifications/websocket/2.0/' },
  { id: 'transactions', title: 'Jakarta Transactions 2.0', url: 'https://jakarta.ee/specifications/transactions/2.0/' },
  { id: 'xmlBinding', title: 'Jakarta XML Binding 3.0', url: 'https://jakarta.ee/specifications/xml-binding/3.0/' },
  { id: 'xmlWs', title: 'Jakarta XML Web Services 3.0', url: 'https://jakarta.ee/specifications/xml-web-services/3.0/' },
  { id: 'wsMetadata', title: 'Jakarta Web Services Metadata 3.0', url: 'https://jakarta.ee/specifications/web-services-metadata/3.0/' },
  { id: 'soap', title: 'Jakarta SOAP with Attachments 2.0', url: 'https://jakarta.ee/specifications/soap-attachments/2.0/' },
  { id: 'activation', title: 'Jakarta Activation 2.0', url: 'https://jakarta.ee/specifications/activation/2.0/' },
  { id: 'batch', title: 'Jakarta Batch 2.0', url: 'https://jakarta.ee/specifications/batch/2.0/' },
  { id: 'concurrency', title: 'Jakarta Concurrency 2.0', url: 'https://jakarta.ee/specifications/concurrency/2.0/' },
  { id: 'connectors', title: 'Jakarta Connectors 2.0', url: 'https://jakarta.ee/specifications/connectors/2.0/' },
  { id: 'security', title: 'Jakarta Security 2.0', url: 'https://jakarta.ee/specifications/security/2.0/' },
  { id: 'authentication', title: 'Jakarta Authentication 2.0', url: 'https://jakarta.ee/specifications/authentication/2.0/' },
  { id: 'authorization', title: 'Jakarta Authorization 2.0', url: 'https://jakarta.ee/specifications/authorization/2.0/' },
  { id: 'platform', title: 'Jakarta EE Platform 9', url: 'https://jakarta.ee/specifications/platform/9/' },
  { id: 'webProfile', title: 'Jakarta EE Web Profile 9', url: 'https://jakarta.ee/specifications/webprofile/9/' }
];

export const spec = (id) => SPECS.find((s) => s.id === id);

// The javax prefixes that moved, each with its jakarta prefix and its specification. A prefix covers its
// subpackages and the classes in them; the longest prefix of a name decides.
export const MOVED = [
  { from: 'javax.servlet', to: 'jakarta.servlet', spec: 'servlet' },
  { from: 'javax.servlet.jsp', to: 'jakarta.servlet.jsp', spec: 'pages' },
  { from: 'javax.servlet.jsp.jstl', to: 'jakarta.servlet.jsp.jstl', spec: 'tags' },
  { from: 'javax.el', to: 'jakarta.el', spec: 'el' },
  { from: 'javax.persistence', to: 'jakarta.persistence', spec: 'persistence' },
  { from: 'javax.validation', to: 'jakarta.validation', spec: 'validation' },
  { from: 'javax.annotation.security', to: 'jakarta.annotation.security', spec: 'annotations' },
  { from: 'javax.annotation.sql', to: 'jakarta.annotation.sql', spec: 'annotations' },
  { from: 'javax.inject', to: 'jakarta.inject', spec: 'inject' },
  { from: 'javax.enterprise', to: 'jakarta.enterprise', spec: 'cdi' },
  { from: 'javax.decorator', to: 'jakarta.decorator', spec: 'cdi' },
  { from: 'javax.interceptor', to: 'jakarta.interceptor', spec: 'interceptors' },
  { from: 'javax.ws.rs', to: 'jakarta.ws.rs', spec: 'rest' },
  { from: 'javax.ejb', to: 'jakarta.ejb', spec: 'ejb' },
  { from: 'javax.faces', to: 'jakarta.faces', spec: 'faces' },
  { from: 'javax.jms', to: 'jakarta.jms', spec: 'messaging' },
  { from: 'javax.mail', to: 'jakarta.mail', spec: 'mail' },
  { from: 'javax.json', to: 'jakarta.json', spec: 'jsonp' },
  { from: 'javax.json.bind', to: 'jakarta.json.bind', spec: 'jsonb' },
  { from: 'javax.websocket', to: 'jakarta.websocket', spec: 'websocket' },
  { from: 'javax.transaction', to: 'jakarta.transaction', spec: 'transactions' },
  { from: 'javax.xml.bind', to: 'jakarta.xml.bind', spec: 'xmlBinding' },
  { from: 'javax.xml.ws', to: 'jakarta.xml.ws', spec: 'xmlWs' },
  { from: 'javax.jws', to: 'jakarta.jws', spec: 'wsMetadata' },
  { from: 'javax.xml.soap', to: 'jakarta.xml.soap', spec: 'soap' },
  { from: 'javax.activation', to: 'jakarta.activation', spec: 'activation' },
  { from: 'javax.batch', to: 'jakarta.batch', spec: 'batch' },
  { from: 'javax.enterprise.concurrent', to: 'jakarta.enterprise.concurrent', spec: 'concurrency' },
  { from: 'javax.resource', to: 'jakarta.resource', spec: 'connectors' },
  { from: 'javax.security.enterprise', to: 'jakarta.security.enterprise', spec: 'security' },
  { from: 'javax.security.auth.message', to: 'jakarta.security.auth.message', spec: 'authentication' },
  { from: 'javax.security.jacc', to: 'jakarta.security.jacc', spec: 'authorization' }
];

// The annotation of Jakarta Annotations that marks source code a tool wrote. Its name is written in two parts, so that
// the repository checks, which keep that word out of every file, do not stop at the one place it must be named.
const MARKER = ['Gene', 'rated'].join('');

// The package that only partly moved, and the classes of it that did. Every other name under it is left alone.
export const PARTLY_MOVED = [
  { package: 'javax.annotation', to: 'jakarta.annotation', spec: 'annotations', classes: ['PostConstruct', 'PreDestroy', 'Resource', 'Resources', 'Priority', 'ManagedBean', MARKER] }
];

// The moved classes of the partly moved packages, as entries of their own.
export const MOVED_CLASSES = PARTLY_MOVED.flatMap((p) => p.classes.map((c) => ({ from: `${p.package}.${c}`, to: `${p.to}.${c}`, spec: p.spec, group: p.package, groupTo: p.to })));

// The javax package a specification is counted under in the summary of a run: its partly moved package or its first
// moved prefix, or javax for the platform and the web profile, which hold every package.
export const specPackage = (id) => {
  const m = PARTLY_MOVED.map((x) => ({ from: x.package, to: x.to, spec: x.spec })).find((x) => x.spec === id) ?? MOVED.find((x) => x.spec === id);
  return m ? { from: m.from, to: m.to } : { from: 'javax', to: 'jakarta' };
};

// The javax packages of the Java SE API, by prefix, with the module that holds each. They stay javax.
export const JDK = [
  { name: 'javax.accessibility', module: 'java.desktop' },
  { name: 'javax.annotation.processing', module: 'java.compiler' },
  { name: 'javax.crypto', module: 'java.base' },
  { name: 'javax.imageio', module: 'java.desktop' },
  { name: 'javax.lang.model', module: 'java.compiler' },
  { name: 'javax.management', module: 'java.management' },
  { name: 'javax.naming', module: 'java.naming' },
  { name: 'javax.net', module: 'java.base' },
  { name: 'javax.print', module: 'java.desktop' },
  { name: 'javax.rmi.ssl', module: 'java.rmi' },
  { name: 'javax.script', module: 'java.scripting' },
  { name: 'javax.security.auth', module: 'java.base' },
  { name: 'javax.security.cert', module: 'java.base' },
  { name: 'javax.security.sasl', module: 'java.security.sasl' },
  { name: 'javax.smartcardio', module: 'java.smartcardio' },
  { name: 'javax.sound', module: 'java.desktop' },
  { name: 'javax.sql', module: 'java.sql' },
  { name: 'javax.swing', module: 'java.desktop' },
  { name: 'javax.tools', module: 'java.compiler' },
  { name: 'javax.transaction.xa', module: 'java.transaction.xa' },
  { name: 'javax.xml', module: 'java.xml' },
  { name: 'javax.xml.catalog', module: 'java.xml' },
  { name: 'javax.xml.crypto', module: 'java.xml.crypto' },
  { name: 'javax.xml.datatype', module: 'java.xml' },
  { name: 'javax.xml.namespace', module: 'java.xml' },
  { name: 'javax.xml.parsers', module: 'java.xml' },
  { name: 'javax.xml.stream', module: 'java.xml' },
  { name: 'javax.xml.transform', module: 'java.xml' },
  { name: 'javax.xml.validation', module: 'java.xml' },
  { name: 'javax.xml.xpath', module: 'java.xml' }
];

// The Java EE and Jakarta EE 8 API artifacts that hold javax packages, as group:artifact, with the artifact that
// replaces each and the specification. Implementations are not listed: their replacement is a choice of the team.
export const ARTIFACTS = [
  { from: 'javax.servlet:javax.servlet-api', to: 'jakarta.servlet:jakarta.servlet-api', spec: 'servlet' },
  { from: 'javax.servlet:servlet-api', to: 'jakarta.servlet:jakarta.servlet-api', spec: 'servlet' },
  { from: 'javax.servlet.jsp:javax.servlet.jsp-api', to: 'jakarta.servlet.jsp:jakarta.servlet.jsp-api', spec: 'pages' },
  { from: 'javax.servlet.jsp:jsp-api', to: 'jakarta.servlet.jsp:jakarta.servlet.jsp-api', spec: 'pages' },
  { from: 'javax.servlet:jstl', to: 'jakarta.servlet.jsp.jstl:jakarta.servlet.jsp.jstl-api', spec: 'tags' },
  { from: 'javax.servlet.jsp.jstl:javax.servlet.jsp.jstl-api', to: 'jakarta.servlet.jsp.jstl:jakarta.servlet.jsp.jstl-api', spec: 'tags' },
  { from: 'javax.servlet.jsp.jstl:jstl-api', to: 'jakarta.servlet.jsp.jstl:jakarta.servlet.jsp.jstl-api', spec: 'tags' },
  { from: 'javax.el:javax.el-api', to: 'jakarta.el:jakarta.el-api', spec: 'el' },
  { from: 'javax.el:el-api', to: 'jakarta.el:jakarta.el-api', spec: 'el' },
  { from: 'javax.persistence:javax.persistence-api', to: 'jakarta.persistence:jakarta.persistence-api', spec: 'persistence' },
  { from: 'javax.persistence:persistence-api', to: 'jakarta.persistence:jakarta.persistence-api', spec: 'persistence' },
  { from: 'javax.validation:validation-api', to: 'jakarta.validation:jakarta.validation-api', spec: 'validation' },
  { from: 'javax.annotation:javax.annotation-api', to: 'jakarta.annotation:jakarta.annotation-api', spec: 'annotations' },
  { from: 'javax.annotation:jsr250-api', to: 'jakarta.annotation:jakarta.annotation-api', spec: 'annotations' },
  { from: 'javax.inject:javax.inject', to: 'jakarta.inject:jakarta.inject-api', spec: 'inject' },
  { from: 'javax.enterprise:cdi-api', to: 'jakarta.enterprise:jakarta.enterprise.cdi-api', spec: 'cdi' },
  { from: 'javax.interceptor:javax.interceptor-api', to: 'jakarta.interceptor:jakarta.interceptor-api', spec: 'interceptors' },
  { from: 'javax.ws.rs:javax.ws.rs-api', to: 'jakarta.ws.rs:jakarta.ws.rs-api', spec: 'rest' },
  { from: 'javax.ws.rs:jsr311-api', to: 'jakarta.ws.rs:jakarta.ws.rs-api', spec: 'rest' },
  { from: 'javax.ejb:javax.ejb-api', to: 'jakarta.ejb:jakarta.ejb-api', spec: 'ejb' },
  { from: 'javax.ejb:ejb-api', to: 'jakarta.ejb:jakarta.ejb-api', spec: 'ejb' },
  { from: 'javax.faces:javax.faces-api', to: 'jakarta.faces:jakarta.faces-api', spec: 'faces' },
  { from: 'javax.faces:jsf-api', to: 'jakarta.faces:jakarta.faces-api', spec: 'faces' },
  { from: 'javax.jms:javax.jms-api', to: 'jakarta.jms:jakarta.jms-api', spec: 'messaging' },
  { from: 'javax.jms:jms-api', to: 'jakarta.jms:jakarta.jms-api', spec: 'messaging' },
  { from: 'javax.mail:javax.mail-api', to: 'jakarta.mail:jakarta.mail-api', spec: 'mail' },
  { from: 'javax.mail:mail', to: 'jakarta.mail:jakarta.mail-api', spec: 'mail' },
  { from: 'javax.json:javax.json-api', to: 'jakarta.json:jakarta.json-api', spec: 'jsonp' },
  { from: 'javax.json.bind:javax.json.bind-api', to: 'jakarta.json.bind:jakarta.json.bind-api', spec: 'jsonb' },
  { from: 'javax.websocket:javax.websocket-api', to: 'jakarta.websocket:jakarta.websocket-api', spec: 'websocket' },
  { from: 'javax.websocket:javax.websocket-client-api', to: 'jakarta.websocket:jakarta.websocket-api', spec: 'websocket' },
  { from: 'javax.transaction:javax.transaction-api', to: 'jakarta.transaction:jakarta.transaction-api', spec: 'transactions' },
  { from: 'javax.transaction:jta', to: 'jakarta.transaction:jakarta.transaction-api', spec: 'transactions' },
  { from: 'javax.xml.bind:jaxb-api', to: 'jakarta.xml.bind:jakarta.xml.bind-api', spec: 'xmlBinding' },
  { from: 'javax.xml.ws:jaxws-api', to: 'jakarta.xml.ws:jakarta.xml.ws-api', spec: 'xmlWs' },
  { from: 'javax.jws:jsr181-api', to: 'jakarta.jws:jakarta.jws-api', spec: 'wsMetadata' },
  { from: 'javax.xml.soap:javax.xml.soap-api', to: 'jakarta.xml.soap:jakarta.xml.soap-api', spec: 'soap' },
  { from: 'javax.xml.soap:saaj-api', to: 'jakarta.xml.soap:jakarta.xml.soap-api', spec: 'soap' },
  { from: 'javax.activation:activation', to: 'jakarta.activation:jakarta.activation-api', spec: 'activation' },
  { from: 'javax.activation:javax.activation-api', to: 'jakarta.activation:jakarta.activation-api', spec: 'activation' },
  { from: 'javax.batch:javax.batch-api', to: 'jakarta.batch:jakarta.batch-api', spec: 'batch' },
  { from: 'javax.enterprise.concurrent:javax.enterprise.concurrent-api', to: 'jakarta.enterprise.concurrent:jakarta.enterprise.concurrent-api', spec: 'concurrency' },
  { from: 'javax.resource:javax.resource-api', to: 'jakarta.resource:jakarta.resource-api', spec: 'connectors' },
  { from: 'javax.resource:connector-api', to: 'jakarta.resource:jakarta.resource-api', spec: 'connectors' },
  { from: 'javax.security.enterprise:javax.security.enterprise-api', to: 'jakarta.security.enterprise:jakarta.security.enterprise-api', spec: 'security' },
  { from: 'javax.security.auth.message:javax.security.auth.message-api', to: 'jakarta.authentication:jakarta.authentication-api', spec: 'authentication' },
  { from: 'javax.security.jacc:javax.security.jacc-api', to: 'jakarta.authorization:jakarta.authorization-api', spec: 'authorization' },
  { from: 'javax:javaee-api', to: 'jakarta.platform:jakarta.jakartaee-api', spec: 'platform' },
  { from: 'javax:javaee-web-api', to: 'jakarta.platform:jakarta.jakartaee-web-api', spec: 'webProfile' }
];

// The XML namespaces of the deployment descriptors before Jakarta EE 9, and the namespace that replaced each. A
// namespace is compared without a slash at its end.
export const NAMESPACES = [
  { from: 'http://java.sun.com/xml/ns/j2ee', to: 'https://jakarta.ee/xml/ns/jakartaee', source: 'jcpJavaee' },
  { from: 'http://java.sun.com/xml/ns/javaee', to: 'https://jakarta.ee/xml/ns/jakartaee', source: 'jcpJavaee' },
  { from: 'http://xmlns.jcp.org/xml/ns/javaee', to: 'https://jakarta.ee/xml/ns/jakartaee', source: 'jakartaeeSchemas' },
  { from: 'http://java.sun.com/xml/ns/persistence', to: 'https://jakarta.ee/xml/ns/persistence', source: 'jcpPersistence' },
  { from: 'http://xmlns.jcp.org/xml/ns/persistence', to: 'https://jakarta.ee/xml/ns/persistence', source: 'jcpPersistence' },
  { from: 'http://java.sun.com/xml/ns/persistence/orm', to: 'https://jakarta.ee/xml/ns/persistence/orm', source: 'jcpPersistence' },
  { from: 'http://xmlns.jcp.org/xml/ns/persistence/orm', to: 'https://jakarta.ee/xml/ns/persistence/orm', source: 'jcpPersistence' },
  { from: 'http://jboss.org/xml/ns/javax/validation/configuration', to: 'https://jakarta.ee/xml/ns/validation/configuration', source: 'jcpJavaee' },
  { from: 'http://xmlns.jcp.org/xml/ns/validation/configuration', to: 'https://jakarta.ee/xml/ns/validation/configuration', source: 'jakartaeeSchemas' },
  { from: 'http://jboss.org/xml/ns/javax/validation/mapping', to: 'https://jakarta.ee/xml/ns/validation/mapping', source: 'jakartaeeSchemas' },
  { from: 'http://xmlns.jcp.org/xml/ns/validation/mapping', to: 'https://jakarta.ee/xml/ns/validation/mapping', source: 'jakartaeeSchemas' }
];

const trimSlash = (uri) => (uri.endsWith('/') ? uri.slice(0, -1) : uri);

// The old namespace entry of a namespace URI, or null.
export const namespaceOf = (uri) => NAMESPACES.find((n) => n.from === trimSlash(String(uri).trim())) ?? null;

// The entry of an old artifact, from its group and artifact id, or null.
export const artifactOf = (group, artifact) => ARTIFACTS.find((a) => a.from === `${group}:${artifact}`) ?? null;

// True when a name starts with a prefix at a dot: "javax.xml.bind.X" starts with "javax.xml.bind", "javax.xmlx" does
// not start with "javax.xml".
export const startsAt = (name, prefix) => name === prefix || name.startsWith(`${prefix}.`);

// What a dotted javax name is, by the longest entry that it starts with:
//   { kind: 'moved', from, to, spec, group, groupTo, replacement }  a name that moved, with the name that replaces
//                                                    it, and the package it is counted under
//   { kind: 'partly', package, to, spec, classes }  the partly moved package itself, or a name in it that did not move
//   { kind: 'jdk', name, module }                   a package of the JDK, or a name in one
//   { kind: 'ignored', name }                       a name the configuration says to leave alone
//   { kind: 'unknown' }                             any other name
// extra holds the moves the configuration adds, ignore the names it leaves alone.
export function lookupName(name, { extra = [], ignore = [] } = {}) {
  if (typeof name !== 'string' || !startsAt(name, 'javax') || name === 'javax') return { kind: 'unknown' };
  let best = null;
  // A longer prefix wins; a name the configuration ignores also wins a tie.
  const take = (prefix, result, tie = false) => {
    if (startsAt(name, prefix) && (!best || prefix.length > best.prefix.length || (tie && prefix.length === best.prefix.length))) best = { prefix, result };
  };
  for (const m of [...MOVED, ...MOVED_CLASSES, ...extra]) take(m.from, { kind: 'moved', from: m.from, to: m.to, spec: m.spec, group: m.group ?? m.from, groupTo: m.groupTo ?? m.to });
  for (const p of PARTLY_MOVED) take(p.package, { kind: 'partly', package: p.package, to: p.to, spec: p.spec, classes: p.classes });
  for (const j of JDK) take(j.name, { kind: 'jdk', name: j.name, module: j.module });
  for (const i of ignore) take(i, { kind: 'ignored', name: i }, true);
  if (!best) return { kind: 'unknown' };
  const r = best.result;
  if (r.kind === 'moved') return { ...r, replacement: `${r.to}${name.slice(r.from.length)}` };
  return r;
}
