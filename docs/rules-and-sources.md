# Rules and sources

Every rule rests on points of public pages, written in this project's own words; this document lists them, with the
choices that are the tool's own. The same points are in src/data.js and are shown by `--explain`, with the page of the
Jakarta EE specification a finding comes from; research/sources.md has a longer note on each page.

## Rules

### `javax-import`

- Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new jakarta.* namespace, as a stable target for teams and tools that migrate their applications. ([Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)](https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html))
- Spring Boot 3 uses the jakarta packages of Jakarta EE rather than javax, so the import statements of a project and its javax dependencies, such as javax.servlet:javax.servlet-api, change to their jakarta forms. ([Spring Boot 3.0 Migration Guide (Spring Boot wiki)](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide))
- An import names a class by its full name, a whole package with .*, or a static member, and a fully qualified name can also be written in the code without an import. ([The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html))
- A Kotlin file imports a single name, every name of a package with .*, or a name under another name with as. ([Packages and imports (Kotlin documentation)](https://kotlinlang.org/docs/packages.html))
- The tool's own choice: only the names of the mapping are reported: a javax name that moved, never one of the JDK and never one the mapping does not know; a static import and an import with as are read like any other.

### `javax-qualified-name`

- Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new jakarta.* namespace, as a stable target for teams and tools that migrate their applications. ([Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)](https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html))
- An import names a class by its full name, a whole package with .*, or a static member, and a fully qualified name can also be written in the code without an import. ([The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html))
- Comments, string literals and text blocks are tokens of their own, so a name written inside a comment or a string is not a reference to a class. ([The Java Language Specification, Java SE 21, Chapter 3: Lexical Structure (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html))
- The tool's own choice: a name in a comment or a string is not code and is not reported by this rule; a name that follows a dot is part of a longer name.

### `partly-moved-import`

- JDK 11 removed the Java EE modules, among them XML Binding, XML Web Services, Activation, the common annotations of javax.annotation and the transaction classes, so these now come from artifacts of their own. ([JEP 320: Remove the Java EE and CORBA Modules (OpenJDK)](https://openjdk.org/jeps/320))
- An import names a class by its full name, a whole package with .*, or a static member, and a fully qualified name can also be written in the code without an import. ([The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html))
- The tool's own choice: javax.annotation is shared: the classes of Jakarta Annotations moved, while other libraries keep names of their own there; without compiling the file the tool cannot tell which ones it uses, so this is a warning.

### `javax-artifact`

- Spring Boot 3 uses the jakarta packages of Jakarta EE rather than javax, so the import statements of a project and its javax dependencies, such as javax.servlet:javax.servlet-api, change to their jakarta forms. ([Spring Boot 3.0 Migration Guide (Spring Boot wiki)](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide))
- A Maven dependency is named by its groupId and artifactId, and an exclusion inside a dependency keeps a transitive artifact out of the build. ([POM Reference (Apache Maven)](https://maven.apache.org/pom.html))
- A Gradle build declares a dependency as a string group:name:version or with separate group, name and version arguments, in the Groovy and the Kotlin DSL. ([Declaring Dependencies (Gradle User Manual)](https://docs.gradle.org/current/userguide/declaring_dependencies.html))
- A version catalog such as gradle/libs.versions.toml names a library with module = "group:name" or with group and name. ([Version Catalogs (Gradle User Manual)](https://docs.gradle.org/current/userguide/version_catalogs.html))
- Maven Central keeps every artifact in a folder of its group and artifact id, so an artifact named by the tool can be looked up there. ([Maven Central repository](https://repo1.maven.org/maven2/))
- The tool's own choice: an artifact is matched by its group and artifact id, never by its version, and the replacement is named the same way; an exclusion, a substitution and a value built from a property are not read as a dependency.

### `old-descriptor-namespace`

- The deployment descriptor schemas of Jakarta EE 9 and later share the namespace https://jakarta.ee/xml/ns/jakartaee, and Persistence and Validation have namespaces of their own under jakarta.ee. ([Jakarta EE XML Schemas (jakarta.ee)](https://jakarta.ee/xml/ns/jakartaee/))
- The descriptors of Java EE 7 and 8 use the namespace http://xmlns.jcp.org/xml/ns/javaee, those of Java EE 5 and 6 http://java.sun.com/xml/ns/javaee, and J2EE 1.4 http://java.sun.com/xml/ns/j2ee. ([Java EE XML Schemas (xmlns.jcp.org)](https://xmlns.jcp.org/xml/ns/javaee/))
- The persistence.xml and orm.xml schemas of Java EE used the namespaces http://java.sun.com/xml/ns/persistence and http://xmlns.jcp.org/xml/ns/persistence. ([Java Persistence XML Schemas (xmlns.jcp.org)](https://xmlns.jcp.org/xml/ns/persistence/))
- A namespace is declared with an xmlns or xmlns:prefix attribute whose value is the name of the namespace, a URI that is compared as a string. ([Namespaces in XML 1.0 (W3C)](https://www.w3.org/TR/xml-names/))
- The tool's own choice: a warning and not an error, because whether a runtime still reads a descriptor of an older version depends on the runtime; the namespace is compared as a string, without a slash at its end.

### `javax-name-in-text`

- Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new jakarta.* namespace, as a stable target for teams and tools that migrate their applications. ([Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)](https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html))
- Comments, string literals and text blocks are tokens of their own, so a name written inside a comment or a string is not a reference to a class. ([The Java Language Specification, Java SE 21, Chapter 3: Lexical Structure (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html))
- A Kotlin string can be written in triple quotes, where escapes are plain text, and any string can hold template expressions that are code. ([Strings (Kotlin documentation)](https://kotlinlang.org/docs/strings.html))
- The tool's own choice: a string may name a class to load by reflection, a property such as javax.persistence.jdbc.url or only words; the tool cannot tell which, so this is a warning; a name written with slashes is read with dots.

### `javax-service-file`

- A provider is registered in a file under META-INF/services named for the full name of the service, which lists the full names of the provider classes one per line, with # starting a comment. ([ServiceLoader, Java SE 21 and JDK 21 API (Oracle)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html))
- Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new jakarta.* namespace, as a stable target for teams and tools that migrate their applications. ([Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)](https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html))
- The tool's own choice: a warning, like a string: the file is read by ServiceLoader at run time, so the compiler does not see it.

## The other points

- The Java SE API itself holds many javax packages, such as javax.crypto, javax.net, javax.naming, javax.sql, javax.security.auth, javax.swing, javax.transaction.xa and javax.xml.parsers, which are part of the JDK and keep their names. ([All Packages, Java SE 21 and JDK 21 API (Oracle)](https://docs.oracle.com/en/java/javase/21/docs/api/allpackages-index.html))
- A line of output such as ::error file=...,line=...::message becomes an annotation on that file and line in the run. ([Workflow commands for GitHub Actions (GitHub Docs)](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands))
- When an object repeats a name the behaviour of the software that reads it cannot be predicted, so the reader of this tool refuses a repeated name. ([RFC 8259, The JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259))

The first is the reason no package of the JDK is ever reported (src/mapping.js and docs/method.md); the second is the
GitHub format; the third is the reader of the configuration file.

## Pages

- [Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation)](https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html)
- [Spring Boot 3.0 Migration Guide (Spring Boot wiki)](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide)
- [All Packages, Java SE 21 and JDK 21 API (Oracle)](https://docs.oracle.com/en/java/javase/21/docs/api/allpackages-index.html)
- [JEP 320: Remove the Java EE and CORBA Modules (OpenJDK)](https://openjdk.org/jeps/320)
- [The Java Language Specification, Java SE 21, Chapter 3: Lexical Structure (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html)
- [The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html)
- [Packages and imports (Kotlin documentation)](https://kotlinlang.org/docs/packages.html)
- [Strings (Kotlin documentation)](https://kotlinlang.org/docs/strings.html)
- [POM Reference (Apache Maven)](https://maven.apache.org/pom.html)
- [Declaring Dependencies (Gradle User Manual)](https://docs.gradle.org/current/userguide/declaring_dependencies.html)
- [Version Catalogs (Gradle User Manual)](https://docs.gradle.org/current/userguide/version_catalogs.html)
- [Maven Central repository](https://repo1.maven.org/maven2/)
- [Jakarta EE XML Schemas (jakarta.ee)](https://jakarta.ee/xml/ns/jakartaee/)
- [Java EE XML Schemas (xmlns.jcp.org)](https://xmlns.jcp.org/xml/ns/javaee/)
- [Java Persistence XML Schemas (xmlns.jcp.org)](https://xmlns.jcp.org/xml/ns/persistence/)
- [Namespaces in XML 1.0 (W3C)](https://www.w3.org/TR/xml-names/)
- [ServiceLoader, Java SE 21 and JDK 21 API (Oracle)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html)
- [Workflow commands for GitHub Actions (GitHub Docs)](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
- [RFC 8259, The JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)

The specifications of Jakarta EE 9 that the mapping comes from:

- [Jakarta Servlet 5.0](https://jakarta.ee/specifications/servlet/5.0/)
- [Jakarta Server Pages 3.0](https://jakarta.ee/specifications/pages/3.0/)
- [Jakarta Standard Tag Library 2.0](https://jakarta.ee/specifications/tags/2.0/)
- [Jakarta Expression Language 4.0](https://jakarta.ee/specifications/expression-language/4.0/)
- [Jakarta Persistence 3.0](https://jakarta.ee/specifications/persistence/3.0/)
- [Jakarta Bean Validation 3.0](https://jakarta.ee/specifications/bean-validation/3.0/)
- [Jakarta Annotations 2.0](https://jakarta.ee/specifications/annotations/2.0/)
- [Jakarta Dependency Injection 2.0](https://jakarta.ee/specifications/dependency-injection/2.0/)
- [Jakarta Contexts and Dependency Injection 3.0](https://jakarta.ee/specifications/cdi/3.0/)
- [Jakarta Interceptors 2.0](https://jakarta.ee/specifications/interceptors/2.0/)
- [Jakarta RESTful Web Services 3.0](https://jakarta.ee/specifications/restful-ws/3.0/)
- [Jakarta Enterprise Beans 4.0](https://jakarta.ee/specifications/enterprise-beans/4.0/)
- [Jakarta Server Faces 3.0](https://jakarta.ee/specifications/faces/3.0/)
- [Jakarta Messaging 3.0](https://jakarta.ee/specifications/messaging/3.0/)
- [Jakarta Mail 2.0](https://jakarta.ee/specifications/mail/2.0/)
- [Jakarta JSON Processing 2.0](https://jakarta.ee/specifications/jsonp/2.0/)
- [Jakarta JSON Binding 2.0](https://jakarta.ee/specifications/jsonb/2.0/)
- [Jakarta WebSocket 2.0](https://jakarta.ee/specifications/websocket/2.0/)
- [Jakarta Transactions 2.0](https://jakarta.ee/specifications/transactions/2.0/)
- [Jakarta XML Binding 3.0](https://jakarta.ee/specifications/xml-binding/3.0/)
- [Jakarta XML Web Services 3.0](https://jakarta.ee/specifications/xml-web-services/3.0/)
- [Jakarta Web Services Metadata 3.0](https://jakarta.ee/specifications/web-services-metadata/3.0/)
- [Jakarta SOAP with Attachments 2.0](https://jakarta.ee/specifications/soap-attachments/2.0/)
- [Jakarta Activation 2.0](https://jakarta.ee/specifications/activation/2.0/)
- [Jakarta Batch 2.0](https://jakarta.ee/specifications/batch/2.0/)
- [Jakarta Concurrency 2.0](https://jakarta.ee/specifications/concurrency/2.0/)
- [Jakarta Connectors 2.0](https://jakarta.ee/specifications/connectors/2.0/)
- [Jakarta Security 2.0](https://jakarta.ee/specifications/security/2.0/)
- [Jakarta Authentication 2.0](https://jakarta.ee/specifications/authentication/2.0/)
- [Jakarta Authorization 2.0](https://jakarta.ee/specifications/authorization/2.0/)
- [Jakarta EE Platform 9](https://jakarta.ee/specifications/platform/9/)
- [Jakarta EE Web Profile 9](https://jakarta.ee/specifications/webprofile/9/)
