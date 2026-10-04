// The public pages the checks rest on, and what each says, written in this project's own words. The pages of the
// Jakarta EE specifications that the mapping comes from are in src/mapping.js. research/sources.md lists every page
// with a longer note on each, and test/data.test.js checks that every page here is listed there and that every rule
// names points that exist. The code in src/ uses these constants and never writes a reason of its own in a report.

export const SOURCES = [
  { id: 'platform9Spec', title: 'Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)', url: 'https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html' },
  { id: 'springBoot3', title: 'Spring Boot 3.0 Migration Guide (Spring Boot wiki)', url: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide' },
  { id: 'javaSePackages', title: 'All Packages, Java SE 21 and JDK 21 API (Oracle)', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/allpackages-index.html' },
  { id: 'jep320', title: 'JEP 320: Remove the Java EE and CORBA Modules (OpenJDK)', url: 'https://openjdk.org/jeps/320' },
  { id: 'jlsLexical', title: 'The Java Language Specification, Java SE 21, Chapter 3: Lexical Structure (Oracle)', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html' },
  { id: 'jlsPackages', title: 'The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle)', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html' },
  { id: 'kotlinPackages', title: 'Packages and imports (Kotlin documentation)', url: 'https://kotlinlang.org/docs/packages.html' },
  { id: 'kotlinStrings', title: 'Strings (Kotlin documentation)', url: 'https://kotlinlang.org/docs/strings.html' },
  { id: 'mavenPom', title: 'POM Reference (Apache Maven)', url: 'https://maven.apache.org/pom.html' },
  { id: 'gradleDeclaring', title: 'Declaring Dependencies (Gradle User Manual)', url: 'https://docs.gradle.org/current/userguide/declaring_dependencies.html' },
  { id: 'gradleCatalogs', title: 'Version Catalogs (Gradle User Manual)', url: 'https://docs.gradle.org/current/userguide/version_catalogs.html' },
  { id: 'mavenCentral', title: 'Maven Central repository', url: 'https://repo1.maven.org/maven2/' },
  { id: 'jakartaeeSchemas', title: 'Jakarta EE XML Schemas (jakarta.ee)', url: 'https://jakarta.ee/xml/ns/jakartaee/' },
  { id: 'jcpJavaee', title: 'Java EE XML Schemas (xmlns.jcp.org)', url: 'https://xmlns.jcp.org/xml/ns/javaee/' },
  { id: 'jcpPersistence', title: 'Java Persistence XML Schemas (xmlns.jcp.org)', url: 'https://xmlns.jcp.org/xml/ns/persistence/' },
  { id: 'xmlNames', title: 'Namespaces in XML 1.0 (W3C)', url: 'https://www.w3.org/TR/xml-names/' },
  { id: 'serviceLoader', title: 'ServiceLoader, Java SE 21 and JDK 21 API (Oracle)', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html' },
  { id: 'githubCommands', title: 'Workflow commands for GitHub Actions (GitHub Docs)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' },
  { id: 'rfc8259', title: 'RFC 8259, The JSON Data Interchange Format', url: 'https://www.rfc-editor.org/rfc/rfc8259' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// What a page says, in this project's own words. Each point names its page.
export const POINTS = {
  namespaceChange: { source: 'platform9Spec', text: 'Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new jakarta.* namespace, as a stable target for teams and tools that migrate their applications' },
  springBootPackages: { source: 'springBoot3', text: 'Spring Boot 3 uses the jakarta packages of Jakarta EE rather than javax, so the import statements of a project and its javax dependencies, such as javax.servlet:javax.servlet-api, change to their jakarta forms' },
  jdkKeepsJavax: { source: 'javaSePackages', text: 'the Java SE API itself holds many javax packages, such as javax.crypto, javax.net, javax.naming, javax.sql, javax.security.auth, javax.swing, javax.transaction.xa and javax.xml.parsers, which are part of the JDK and keep their names' },
  removedFromJdk: { source: 'jep320', text: 'JDK 11 removed the Java EE modules, among them XML Binding, XML Web Services, Activation, the common annotations of javax.annotation and the transaction classes, so these now come from artifacts of their own' },
  importDeclarations: { source: 'jlsPackages', text: 'an import names a class by its full name, a whole package with .*, or a static member, and a fully qualified name can also be written in the code without an import' },
  lexicalStructure: { source: 'jlsLexical', text: 'comments, string literals and text blocks are tokens of their own, so a name written inside a comment or a string is not a reference to a class' },
  kotlinImports: { source: 'kotlinPackages', text: 'a Kotlin file imports a single name, every name of a package with .*, or a name under another name with as' },
  kotlinStrings: { source: 'kotlinStrings', text: 'a Kotlin string can be written in triple quotes, where escapes are plain text, and any string can hold template expressions that are code' },
  pomDependencies: { source: 'mavenPom', text: 'a Maven dependency is named by its groupId and artifactId, and an exclusion inside a dependency keeps a transitive artifact out of the build' },
  gradleNotation: { source: 'gradleDeclaring', text: 'a Gradle build declares a dependency as a string group:name:version or with separate group, name and version arguments, in the Groovy and the Kotlin DSL' },
  versionCatalog: { source: 'gradleCatalogs', text: 'a version catalog such as gradle/libs.versions.toml names a library with module = "group:name" or with group and name' },
  centralCoordinates: { source: 'mavenCentral', text: 'Maven Central keeps every artifact in a folder of its group and artifact id, so an artifact named by the tool can be looked up there' },
  jakartaNamespace: { source: 'jakartaeeSchemas', text: 'the deployment descriptor schemas of Jakarta EE 9 and later share the namespace https://jakarta.ee/xml/ns/jakartaee, and Persistence and Validation have namespaces of their own under jakarta.ee' },
  oldNamespaces: { source: 'jcpJavaee', text: 'the descriptors of Java EE 7 and 8 use the namespace http://xmlns.jcp.org/xml/ns/javaee, those of Java EE 5 and 6 http://java.sun.com/xml/ns/javaee, and J2EE 1.4 http://java.sun.com/xml/ns/j2ee' },
  persistenceNamespaces: { source: 'jcpPersistence', text: 'the persistence.xml and orm.xml schemas of Java EE used the namespaces http://java.sun.com/xml/ns/persistence and http://xmlns.jcp.org/xml/ns/persistence' },
  xmlnsAttribute: { source: 'xmlNames', text: 'a namespace is declared with an xmlns or xmlns:prefix attribute whose value is the name of the namespace, a URI that is compared as a string' },
  serviceFiles: { source: 'serviceLoader', text: 'a provider is registered in a file under META-INF/services named for the full name of the service, which lists the full names of the provider classes one per line, with # starting a comment' },
  githubAnnotations: { source: 'githubCommands', text: 'a line of output such as ::error file=...,line=...::message becomes an annotation on that file and line in the run' },
  jsonRepeatedNames: { source: 'rfc8259', text: 'when an object repeats a name the behaviour of the software that reads it cannot be predicted, so the reader of this tool refuses a repeated name' }
};

// The page of a point.
export const pointPage = (key) => source(POINTS[key].source);

// The levels of a finding, from the lowest. A finding at the level error makes the run fail.
export const LEVELS = ['notice', 'warning', 'error'];

// The sentence every report ends with, before the result.
export const NOTICE = 'This report lists the javax names, artifacts and descriptor namespaces it found in the files it was given, against the mapping of src/mapping.js. It does not compile the code, resolve dependencies or look inside the libraries a project uses, so a clean run does not mean the project builds and runs on Jakarta EE 9 or later (docs/limits.md).';
