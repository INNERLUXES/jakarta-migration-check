# Sources

The public pages the checks of this tool are based on, each with a short note in this project's own words on what the
page says and which checks lean on it. Nothing here is a copy of a page: read the page itself for its exact wording.
src/data.js holds the general pages and the points the reports show, src/mapping.js holds the pages of the Jakarta EE
specifications with the names taken from them, and test/data.test.js and test/mapping.test.js check that every page
there is listed here. Each page was fetched and read before it was listed.

## The move itself

### Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)

https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html

The platform specification of Jakarta EE 9. Its section on the changes of the release says that the goal of Jakarta
EE 9 is to give the specifications of Jakarta EE 8, with almost no change of function, under the new `jakarta.*`
namespace, and that the release removes a few old, optional or deprecated specifications. It calls the release mainly
a release for tools: a stable target for teams that test the migration of their applications, and for vendors that
build tools for the new namespace. Every rule of this tool rests on that change; the specification pages below give
the names it applies to.

### Spring Boot 3.0 Migration Guide (Spring Boot wiki)

https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide

The guide of the Spring Boot project for the move to Spring Boot 3. It explains that Spring Boot 3 uses the jakarta
packages of Jakarta EE where it used javax before, that the import statements of a project have to change with it,
and that dependencies such as `javax.servlet:javax.servlet-api` are replaced by their jakarta forms such as
`jakarta.servlet:jakarta.servlet-api`. It points to tools that rewrite the code. This tool does not rewrite anything;
it lists what still has to change (`javax-import`, `javax-artifact`).

### JEP 320: Remove the Java EE and CORBA Modules (OpenJDK)

https://openjdk.org/jeps/320

The proposal that took the Java EE modules out of the JDK in JDK 11: XML Web Services with SOAP with Attachments and
Web Services Metadata, XML Binding, Activation, the common annotations of `javax.annotation`, the transaction classes
of `javax.transaction`, and CORBA. Since then these packages come from artifacts of their own, which is why a build
names them and why `javax.annotation` is shared between those annotations and the annotation processing package that
stayed in the JDK (`partly-moved-import`).

### All Packages, Java SE 21 and JDK 21 API (Oracle)

https://docs.oracle.com/en/java/javase/21/docs/api/allpackages-index.html

The list of every package of the Java SE API. It holds many javax packages that are part of the JDK and keep their
names: `javax.crypto`, `javax.net`, `javax.naming`, `javax.sql`, `javax.security.auth`, `javax.swing`,
`javax.transaction.xa`, `javax.xml.parsers`, `javax.xml.transform`, `javax.annotation.processing` and the others. The
`JDK` list of src/mapping.js is built from it, and test/mapping.test.js writes out every one of these packages and
checks that none of them is ever reported.

## The specifications of Jakarta EE 9

Each page names the release of the specification, links to its API documentation and names its Maven artifact. The
packages of src/mapping.js were read from the API documentation of each release, and the artifacts were looked up on
Maven Central (below). Where a page names an artifact that Maven Central does not hold, the note says so and the tool
names the one Maven Central holds. No version is taken from these pages into the tool.

### Jakarta Servlet 5.0

https://jakarta.ee/specifications/servlet/5.0/

The packages `jakarta.servlet`, `jakarta.servlet.annotation`, `jakarta.servlet.descriptor` and `jakarta.servlet.http`,
and the artifact `jakarta.servlet:jakarta.servlet-api`.

### Jakarta Server Pages 3.0

https://jakarta.ee/specifications/pages/3.0/

The packages `jakarta.servlet.jsp`, `jakarta.servlet.jsp.el` and `jakarta.servlet.jsp.tagext`. The page names the
artifact `jakarta.pages:jakarta.pages-api`, which Maven Central does not hold; the API is published there as
`jakarta.servlet.jsp:jakarta.servlet.jsp-api`, and that is the artifact the tool names.

### Jakarta Standard Tag Library 2.0

https://jakarta.ee/specifications/tags/2.0/

The packages under `jakarta.servlet.jsp.jstl` (core, fmt, sql, tlv) and the artifact
`jakarta.servlet.jsp.jstl:jakarta.servlet.jsp.jstl-api`.

### Jakarta Expression Language 4.0

https://jakarta.ee/specifications/expression-language/4.0/

The package `jakarta.el` and the artifact `jakarta.el:jakarta.el-api`.

### Jakarta Persistence 3.0

https://jakarta.ee/specifications/persistence/3.0/

The packages `jakarta.persistence` with `criteria`, `metamodel` and `spi`, and the artifact
`jakarta.persistence:jakarta.persistence-api`.

### Jakarta Bean Validation 3.0

https://jakarta.ee/specifications/bean-validation/3.0/

The packages under `jakarta.validation` (constraints, bootstrap, executable, groups, metadata, spi, valueextraction and
the others) and the artifact `jakarta.validation:jakarta.validation-api`.

### Jakarta Annotations 2.0

https://jakarta.ee/specifications/annotations/2.0/

The packages `jakarta.annotation`, `jakarta.annotation.security` and `jakarta.annotation.sql`, and the artifact
`jakarta.annotation:jakarta.annotation-api`. The package `jakarta.annotation` holds seven classes,
`PostConstruct`, `PreDestroy`, `Resource`, `Resources`, `Priority`, `ManagedBean` and the annotation that marks code a
tool wrote; these are the only names of `javax.annotation`
that the tool moves, because other names under `javax.annotation` belong to other libraries and to the JDK.

### Jakarta Dependency Injection 2.0

https://jakarta.ee/specifications/dependency-injection/2.0/

The package `jakarta.inject` and the artifact `jakarta.inject:jakarta.inject-api`.

### Jakarta Contexts and Dependency Injection 3.0

https://jakarta.ee/specifications/cdi/3.0/

The packages under `jakarta.enterprise` (context, event, inject, util) and `jakarta.decorator`. The page names the
artifact `jakarta.enterprise:jakarta.cdi-api`, which Maven Central does not hold; the API is published there as
`jakarta.enterprise:jakarta.enterprise.cdi-api`, and that is the artifact the tool names.

### Jakarta Interceptors 2.0

https://jakarta.ee/specifications/interceptors/2.0/

The package `jakarta.interceptor` and the artifact `jakarta.interceptor:jakarta.interceptor-api`.

### Jakarta RESTful Web Services 3.0

https://jakarta.ee/specifications/restful-ws/3.0/

The packages under `jakarta.ws.rs` (client, container, core, ext, sse) and the artifact `jakarta.ws.rs:jakarta.ws.rs-api`.

### Jakarta Enterprise Beans 4.0

https://jakarta.ee/specifications/enterprise-beans/4.0/

The packages `jakarta.ejb`, `jakarta.ejb.embeddable` and `jakarta.ejb.spi`, and the artifact `jakarta.ejb:jakarta.ejb-api`.

### Jakarta Server Faces 3.0

https://jakarta.ee/specifications/faces/3.0/

The packages under `jakarta.faces` and the artifact `jakarta.faces:jakarta.faces-api`.

### Jakarta Messaging 3.0

https://jakarta.ee/specifications/messaging/3.0/

The package `jakarta.jms` and the artifact `jakarta.jms:jakarta.jms-api`.

### Jakarta Mail 2.0

https://jakarta.ee/specifications/mail/2.0/

The packages under `jakarta.mail` (event, internet, search, util) and the artifact `jakarta.mail:jakarta.mail-api`.

### Jakarta JSON Processing 2.0

https://jakarta.ee/specifications/jsonp/2.0/

The packages `jakarta.json`, `jakarta.json.spi` and `jakarta.json.stream`, and the artifact `jakarta.json:jakarta.json-api`.

### Jakarta JSON Binding 2.0

https://jakarta.ee/specifications/jsonb/2.0/

The packages under `jakarta.json.bind` and the artifact `jakarta.json.bind:jakarta.json.bind-api`. Because
`javax.json.bind` is longer than `javax.json`, the longest prefix sends its names here and not to JSON Processing.

### Jakarta WebSocket 2.0

https://jakarta.ee/specifications/websocket/2.0/

The packages `jakarta.websocket` and `jakarta.websocket.server`, and the artifact `jakarta.websocket:jakarta.websocket-api`.

### Jakarta Transactions 2.0

https://jakarta.ee/specifications/transactions/2.0/

The package `jakarta.transaction` and the artifact `jakarta.transaction:jakarta.transaction-api`. The package
`javax.transaction.xa` is part of the JDK and stays.

### Jakarta XML Binding 3.0

https://jakarta.ee/specifications/xml-binding/3.0/

The packages under `jakarta.xml.bind` and the artifact `jakarta.xml.bind:jakarta.xml.bind-api`.

### Jakarta XML Web Services 3.0

https://jakarta.ee/specifications/xml-web-services/3.0/

The packages under `jakarta.xml.ws` and the artifact `jakarta.xml.ws:jakarta.xml.ws-api`.

### Jakarta Web Services Metadata 3.0

https://jakarta.ee/specifications/web-services-metadata/3.0/

The packages `jakarta.jws` and `jakarta.jws.soap`, and the artifact `jakarta.jws:jakarta.jws-api`.

### Jakarta SOAP with Attachments 2.0

https://jakarta.ee/specifications/soap-attachments/2.0/

The package `jakarta.xml.soap` and the artifact `jakarta.xml.soap:jakarta.xml.soap-api`.

### Jakarta Activation 2.0

https://jakarta.ee/specifications/activation/2.0/

The package `jakarta.activation` and the artifact `jakarta.activation:jakarta.activation-api`.

### Jakarta Batch 2.0

https://jakarta.ee/specifications/batch/2.0/

The packages under `jakarta.batch` and the artifact `jakarta.batch:jakarta.batch-api`.

### Jakarta Concurrency 2.0

https://jakarta.ee/specifications/concurrency/2.0/

The package `jakarta.enterprise.concurrent` and the artifact
`jakarta.enterprise.concurrent:jakarta.enterprise.concurrent-api`. Its prefix is longer than the one of Contexts and
Dependency Injection, so its names are counted here.

### Jakarta Connectors 2.0

https://jakarta.ee/specifications/connectors/2.0/

The packages under `jakarta.resource` and the artifact `jakarta.resource:jakarta.resource-api`.

### Jakarta Security 2.0

https://jakarta.ee/specifications/security/2.0/

The packages under `jakarta.security.enterprise` and the artifact `jakarta.security.enterprise:jakarta.security.enterprise-api`.

### Jakarta Authentication 2.0

https://jakarta.ee/specifications/authentication/2.0/

The packages under `jakarta.security.auth.message` and the artifact `jakarta.authentication:jakarta.authentication-api`.
The old name `javax.security.auth.message` sits inside `javax.security.auth`, which is a package of the JDK; the
longer prefix decides, so only the names under `message` move.

### Jakarta Authorization 2.0

https://jakarta.ee/specifications/authorization/2.0/

The package `jakarta.security.jacc` and the artifact `jakarta.authorization:jakarta.authorization-api`.

### Jakarta EE Platform 9

https://jakarta.ee/specifications/platform/9/

The page of the full platform and its artifact `jakarta.platform:jakarta.jakartaee-api`, which replaces
`javax:javaee-api`.

### Jakarta EE Web Profile 9

https://jakarta.ee/specifications/webprofile/9/

The page of the web profile. It names the artifact `jakarta.platform:jakarta.webprofile-api`, which Maven Central does
not hold; the web profile is published there as `jakarta.platform:jakarta.jakartaee-web-api`, and that is the artifact
the tool names in place of `javax:javaee-web-api`.

### Maven Central repository

https://repo1.maven.org/maven2/

The repository where Maven and Gradle builds find their artifacts, kept in a folder per group and artifact id. Every
artifact of src/mapping.js, old and new, was looked up there by its group and artifact id before it was listed.

## The descriptors

### Jakarta EE XML Schemas (jakarta.ee)

https://jakarta.ee/xml/ns/jakartaee/

The page of the deployment descriptor schemas of Jakarta EE 9 and later: `web.xml`, `web-fragment.xml`, `beans.xml`,
`faces-config.xml`, `ejb-jar.xml`, `application.xml`, `application-client.xml`, the connector, permissions and batch
files share one namespace, and Persistence and Validation have namespaces of their own under jakarta.ee. The schema
files themselves name `https://jakarta.ee/xml/ns/jakartaee`, `https://jakarta.ee/xml/ns/persistence` (and `/orm`) and
`https://jakarta.ee/xml/ns/validation/configuration` (and `/mapping`) as their target namespaces; those are the names
the tool gives (`old-descriptor-namespace`).

### Java EE XML Schemas (xmlns.jcp.org)

https://xmlns.jcp.org/xml/ns/javaee/

The page of the descriptor schemas of Java EE. The schemas of Java EE 7 and later share the namespace
`http://xmlns.jcp.org/xml/ns/javaee`; those of Java EE 5 and 6 use `http://java.sun.com/xml/ns/javaee`, and J2EE 1.4
used `http://java.sun.com/xml/ns/j2ee`. The page also lists the older Bean Validation namespace under jboss.org. These
are the old namespaces of src/mapping.js.

### Java Persistence XML Schemas (xmlns.jcp.org)

https://xmlns.jcp.org/xml/ns/persistence/

The page of the `persistence.xml` and `orm.xml` schemas of Java EE, in the namespaces
`http://xmlns.jcp.org/xml/ns/persistence` and, for the older versions, `http://java.sun.com/xml/ns/persistence`.

### Namespaces in XML 1.0 (W3C)

https://www.w3.org/TR/xml-names/

The recommendation that defines namespaces in XML: a namespace is declared with an attribute `xmlns` or
`xmlns:prefix`, and its name is a URI compared as a string. The tool reads exactly those attributes and compares the
value as a string, without a slash at its end, so `https://xmlns.jcp.org/...` is not the old namespace.

## The sources and the builds

### The Java Language Specification, Java SE 21, Chapter 3: Lexical Structure (Oracle)

https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html

The chapter on how Java source text is split into tokens: comments, identifiers, string literals, character literals
and text blocks, with their escapes. A name in a comment or a string is not a reference to a class, which is why the
lexer of the tool drops comments and keeps strings apart (`javax-qualified-name`, `javax-name-in-text`).

### The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle)

https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html

The chapter on compilation units: a package declaration, then imports of a single class, of every class of a package
on demand, or of static members. A class can also be named by its fully qualified name anywhere in the code
(`javax-import`, `javax-qualified-name`).

### Packages and imports (Kotlin documentation)

https://kotlinlang.org/docs/packages.html

The page on Kotlin packages and imports: a single name, every name of a package with `.*`, or a name imported under
another name with `as`. The tool reads all three forms.

### Strings (Kotlin documentation)

https://kotlinlang.org/docs/strings.html

The page on Kotlin strings: multiline strings in triple quotes, in which escapes are plain text, and template
expressions that hold code inside a string. The lexer reads raw strings and templates in that way, so the code of a
template is read as code.

### POM Reference (Apache Maven)

https://maven.apache.org/pom.html

The reference of the Maven project file: a dependency is named by its groupId and artifactId with its version and
scope, dependencies can also sit in `dependencyManagement` and in a plugin, and an exclusion inside a dependency keeps
a transitive artifact out of the build. The tool reads every dependency and never an exclusion (`javax-artifact`).

### Declaring Dependencies (Gradle User Manual)

https://docs.gradle.org/current/userguide/declaring_dependencies.html

The page on declaring dependencies in Gradle, in the Groovy and the Kotlin DSL: a string `group:name:version` or
separate group, name and version values. The tool reads both forms, line by line.

### Version Catalogs (Gradle User Manual)

https://docs.gradle.org/current/userguide/version_catalogs.html

The page on version catalogs such as `gradle/libs.versions.toml`, which name a library with `module = "group:name"` or
with `group` and `name`, and a version or a version reference.

### ServiceLoader, Java SE 21 and JDK 21 API (Oracle)

https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html

The reference of the class that finds service providers. A provider is registered in a file under
`META-INF/services` whose name is the full name of the service, and the file lists the full names of the provider
classes, one per line, with `#` starting a comment. After the move the service is looked up under its jakarta name,
so a file named for the javax name is no longer found (`javax-service-file`).

## The output and the configuration

### Workflow commands for GitHub Actions (GitHub Docs)

https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

The page that describes the `::error`, `::warning` and `::notice` commands with their `file`, `line`, `col` and
`title` properties, which turn a line of output into an annotation on a file. `--format github` writes one such
command per finding, with the file, the line and the column.

### RFC 8259, The JSON Data Interchange Format

https://www.rfc-editor.org/rfc/rfc8259

The JSON standard. Its section on objects notes that when the names in an object are not unique, programs that read
it behave in different ways. The reader of the configuration refuses a repeated name instead of keeping one of the
values, so a setting never depends on which value a library would keep.
