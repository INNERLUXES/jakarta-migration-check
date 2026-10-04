# jakarta-migration-check

Reads a Java or Kotlin project and reports what still uses the javax names that moved to jakarta in Jakarta EE 9, the move that every application on Jakarta EE 9 and later, and on Spring Boot 3, has to make. Give it the root of the project, a module or single files. It reads the imports and the fully qualified names of the `.java` and `.kt` files, the dependencies of `pom.xml`, the Gradle builds and the version catalogs, the namespaces and values of the deployment descriptors (`web.xml`, `persistence.xml`, `beans.xml`, `faces-config.xml` and the others), the strings of the code and the service files under `META-INF/services`. Each finding has the file, the line and the column, the jakarta name or artifact that replaces the old one and the Jakarta EE specification it comes from, and the tool exits with a code a pipeline can act on.

Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new `jakarta.*` namespace (https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html), and Spring Boot 3 is built on it, so the import statements and the javax dependencies of a project have to change with it (https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide). Not every javax package moved: `javax.crypto`, `javax.sql`, `javax.naming`, `javax.security.auth`, `javax.transaction.xa`, `javax.annotation.processing`, `javax.xml.parsers` and the other javax packages of the JDK keep their names, and a search for `javax.` that renames them breaks the build. This tool looks every name up in a mapping taken from the pages of the Jakarta EE 9 specifications and the list of all packages of the Java SE API, so it reports only what moved, and says what it moved to.

- **Imports and names.** An import (single, on demand, static, or with a Kotlin alias) or a fully qualified name in the code whose javax package moved is an error, with its jakarta replacement.
- **javax.annotation, done right.** Only the classes of Jakarta Annotations moved (`PostConstruct`, `PreDestroy`, `Resource` and four more); `javax.annotation.processing` and the annotations of other libraries stay. `import javax.annotation.*` is a warning that names the classes that moved.
- **Builds.** A Java EE artifact in a `pom.xml`, a Gradle build (Groovy or Kotlin DSL) or a version catalog, such as `javax.servlet:javax.servlet-api`, is an error, with the Jakarta artifact that replaces it. Exclusions and substitutions are left alone.
- **Descriptors.** A deployment descriptor in a namespace of Java EE, such as `http://xmlns.jcp.org/xml/ns/javaee`, is a warning, with the namespace of Jakarta EE 9 and later.
- **Reflection.** A string, a descriptor value or a service file that names a javax class that moved is a warning: it may be a class loaded by name or a property such as `javax.persistence.jdbc.url`.
- **Never the JDK.** No javax package of the Java SE API is ever reported, and a test proves it for every one of them.
- **Everything explained.** `--explain` shows the rule, the specification and the public sources behind each finding, and where a rule is the tool's own choice; `--summary` counts the findings per javax package.
- Reports as text, JSON and GitHub workflow annotations, with an exit code for a pipeline: `0` no error, `1` an error, `2` usage or input error.
- Plain JavaScript, no dependencies, no build run and no network.

```
npm test
```

```
tests 198
pass 195
fail 0
skipped 3
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a symbolic link, a device or file permissions (a file named through a symbolic link and links inside a folder, `/dev/zero` named as an input, and a file and a folder with no read access); they are guarded with `process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/jakarta-migration-check.git
cd jakarta-migration-check
node bin/jakarta-migration-check.js examples/legacy --config examples/config.json
```

Or without a clone, on your own project:

```
npx --yes github:INNERLUXES/jakarta-migration-check .
```

`examples/` holds two made-up versions of a made-up web shop: `examples/legacy` before the move, with one problem of every kind, and `examples/migrated` after it. Both import packages of the JDK, name javax packages in comments and exclude an old jar in their build, and none of that is reported. `examples/config.json` leaves out a folder of code that the build writes.

## Usage

```
jakarta-migration-check <file-or-folder>... [--config <file>] [options]
```

```
--config <file>           settings in strict JSON: files, exclude, packages (moves to add), ignore (javax names to
                          leave alone), the level of the rules and minSeverity (--print-defaults shows them)
--format <name>           text, json or github (default: text); github writes workflow commands that GitHub shows
                          as annotations on the files
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: notice, warning, error (default: minSeverity of
                          the configuration, else notice)
--explain                 show the rule, the specification and the public sources behind each finding
--summary                 add the count of findings per javax package to the text report
--print-defaults          print the built-in configuration and exit
--help                    show the usage
--version                 show the version
```

A file named on the command line is read whatever its path, if it is of a kind the tool reads. A folder is walked, and the Java and Kotlin sources, `pom.xml`, the Gradle builds and catalogs, the descriptors and the service files in it are read, in the order of their paths; `target` and `build` at the top and one module down, `.git`, `.gradle`, `.idea`, `.mvn` and `node_modules` are not entered, and a symbolic link is skipped, not followed. The path in the report is relative to the folder you run the command in, with forward slashes on every system, followed by the line.

The report of the legacy example starts with what was read, the configuration, the rules and the counts, then the findings, errors first, then what was read:

```
jakarta-migration-check: examples/legacy
input: examples/legacy (11 files: 4 java, 1 kotlin, 1 maven, 1 gradle, 1 catalog, 2 descriptor, 1 service)
config: examples/config.json (Larkspur Books): 20 file patterns, 5 exclude patterns, no added moves, no ignored names; minimum severity notice
rules: javax-import (error); javax-qualified-name (error); partly-moved-import (warning); javax-artifact (error); old-descriptor-namespace (warning); javax-name-in-text (warning); javax-service-file (warning)
findings: 28 (20 error, 8 warning)

Findings (28)

  ERROR    javax-artifact            examples/legacy/gradle/libs.versions.toml:2
           javax.xml.bind:jaxb-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.xml.bind:jakarta.xml.bind-api (Jakarta XML Binding 3.0)

  ERROR    javax-artifact            examples/legacy/pom.xml:12
           javax.servlet:javax.servlet-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.servlet:jakarta.servlet-api (Jakarta Servlet 5.0)

  ERROR    javax-artifact            examples/legacy/pom.xml:18
           javax.persistence:javax.persistence-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.persistence:jakarta.persistence-api (Jakarta Persistence 3.0)

  ERROR    javax-artifact            examples/legacy/pom.xml:23
           javax.validation:validation-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.validation:jakarta.validation-api (Jakarta Bean Validation 3.0)

  ERROR    javax-artifact            examples/legacy/reports/build.gradle:6
           javax.ws.rs:javax.ws.rs-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.ws.rs:jakarta.ws.rs-api (Jakarta RESTful Web Services 3.0)

  ERROR    javax-artifact            examples/legacy/reports/build.gradle:7
           javax.inject:javax.inject is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.inject:jakarta.inject-api (Jakarta Dependency Injection 2.0)

  ERROR    javax-import              examples/legacy/reports/src/main/kotlin/com/larkspur/reports/ReportResource.kt:3
           import javax.inject.Inject: moved to jakarta.inject.Inject (Jakarta Dependency Injection 2.0)

  ERROR    javax-import              examples/legacy/reports/src/main/kotlin/com/larkspur/reports/ReportResource.kt:4
           import javax.ws.rs.GET: moved to jakarta.ws.rs.GET (Jakarta RESTful Web Services 3.0)

  ERROR    javax-import              examples/legacy/reports/src/main/kotlin/com/larkspur/reports/ReportResource.kt:5
           import javax.ws.rs.Path: moved to jakarta.ws.rs.Path (Jakarta RESTful Web Services 3.0)

  ERROR    javax-import              examples/legacy/reports/src/main/kotlin/com/larkspur/reports/ReportResource.kt:6
           import javax.ws.rs.core.MediaType: moved to jakarta.ws.rs.core.MediaType (Jakarta RESTful Web Services 3.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/AppConfig.java:3
           import static javax.persistence.LockModeType.PESSIMISTIC_WRITE: moved to jakarta.persistence.LockModeType.PESSIMISTIC_WRITE (Jakarta Persistence 3.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/AppConfig.java:6
           import javax.transaction.Transactional: moved to jakarta.transaction.Transactional (Jakarta Transactions 2.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/model/Book.java:3
           import javax.persistence.*: moved to jakarta.persistence.* (Jakarta Persistence 3.0)

  ERROR    javax-qualified-name      examples/legacy/src/main/java/com/larkspur/books/model/Book.java:15
           javax.validation.constraints.NotNull is written out in full: moved to jakarta.validation.constraints.NotNull (Jakarta Bean Validation 3.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java:4
           import javax.annotation.PostConstruct: moved to jakarta.annotation.PostConstruct (Jakarta Annotations 2.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java:7
           import javax.servlet.ServletException: moved to jakarta.servlet.ServletException (Jakarta Servlet 5.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java:8
           import javax.servlet.annotation.WebServlet: moved to jakarta.servlet.annotation.WebServlet (Jakarta Servlet 5.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java:9
           import javax.servlet.http.HttpServlet: moved to jakarta.servlet.http.HttpServlet (Jakarta Servlet 5.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java:10
           import javax.servlet.http.HttpServletRequest: moved to jakarta.servlet.http.HttpServletRequest (Jakarta Servlet 5.0)

  ERROR    javax-import              examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java:11
           import javax.servlet.http.HttpServletResponse: moved to jakarta.servlet.http.HttpServletResponse (Jakarta Servlet 5.0)

  WARNING  partly-moved-import       examples/legacy/src/main/java/com/larkspur/books/AppConfig.java:5
           import javax.annotation.*: only 7 classes of javax.annotation moved, PostConstruct, PreDestroy, Resource and 4 more, to jakarta.annotation (Jakarta Annotations 2.0); the other names of javax.annotation belong to other libraries and stay, so import the ones this file uses by name

  WARNING  javax-name-in-text        examples/legacy/src/main/java/com/larkspur/books/AppConfig.java:19
           the string "javax.ws.rs.core.Application" names javax.ws.rs.core.Application, which moved to jakarta.ws.rs.core.Application (Jakarta RESTful Web Services 3.0); a class name read by reflection, a property name or a key must change with it

  WARNING  javax-name-in-text        examples/legacy/src/main/java/com/larkspur/books/model/Book.java:18
           the string "javax.persistence.lock.timeout" names javax.persistence.lock.timeout, which moved to jakarta.persistence.lock.timeout (Jakarta Persistence 3.0); a class name read by reflection, a property name or a key must change with it

  WARNING  old-descriptor-namespace  examples/legacy/src/main/resources/META-INF/persistence.xml:2
           xmlns="http://java.sun.com/xml/ns/persistence" is a namespace of the descriptors before Jakarta EE 9; Jakarta EE 9 and later use https://jakarta.ee/xml/ns/persistence, with the schema location and the version that go with it

  WARNING  javax-name-in-text        examples/legacy/src/main/resources/META-INF/persistence.xml:6
           the attribute name="javax.persistence.jdbc.url" of <property> names javax.persistence.jdbc.url, which moved to jakarta.persistence.jdbc.url (Jakarta Persistence 3.0); a class name read by reflection, a property name or a key must change with it

  WARNING  javax-service-file        examples/legacy/src/main/resources/META-INF/services/javax.servlet.ServletContainerInitializer:1
           the service file is named for javax.servlet.ServletContainerInitializer, which moved to jakarta.servlet.ServletContainerInitializer (Jakarta Servlet 5.0); ServiceLoader looks the providers up under the new name, so this file must be renamed to jakarta.servlet.ServletContainerInitializer

  WARNING  old-descriptor-namespace  examples/legacy/src/main/webapp/WEB-INF/web.xml:2
           xmlns="http://xmlns.jcp.org/xml/ns/javaee" is a namespace of the descriptors before Jakarta EE 9; Jakarta EE 9 and later use https://jakarta.ee/xml/ns/jakartaee, with the schema location and the version that go with it

  WARNING  javax-name-in-text        examples/legacy/src/main/webapp/WEB-INF/web.xml:5
           the value "javax.faces.PROJECT_STAGE" of <param-name> names javax.faces.PROJECT_STAGE, which moved to jakarta.faces.PROJECT_STAGE (Jakarta Server Faces 3.0); a class name read by reflection, a property name or a key must change with it

Read: examples/legacy

  files          11: 4 java, 1 kotlin, 1 maven, 1 gradle, 1 catalog, 2 descriptor, 1 service
  imports        26 read; javax imports 25: 13 moved, 1 of javax.annotation, not moved, 11 in the JDK
  code names     javax names written out in full 2: 1 moved, 1 in the JDK
  texts          javax names in strings and descriptor values 4: 4 moved
  dependencies   8 read; 6 Java EE artifacts
  descriptors    2 read; 2 with a namespace of Java EE
  service files  1 read
  mapping        32 moved prefixes, 7 moved classes, 30 JDK prefixes, 49 artifacts, 11 namespaces; 0 added and 0 ignored by the configuration

This report lists the javax names, artifacts and descriptor namespaces it found in the files it was given, against the mapping of src/mapping.js. It does not compile the code, resolve dependencies or look inside the libraries a project uses, so a clean run does not mean the project builds and runs on Jakarta EE 9 or later (docs/limits.md).

RESULT: FAIL - 20 errors (and 8 warnings)
```

With `--explain`, each finding also shows the rule, the specification, the points of the public pages it rests on and the tool's own choice:

```
  ERROR    javax-qualified-name      examples/legacy/src/main/java/com/larkspur/books/model/Book.java:15
           javax.validation.constraints.NotNull is written out in full: moved to jakarta.validation.constraints.NotNull (Jakarta Bean Validation 3.0)
           rule: a fully qualified javax name in the code of a Java or Kotlin file, such as @javax.persistence.Entity, that moved to jakarta, outside the imports and the package declaration
           specification: Jakarta Bean Validation 3.0, https://jakarta.ee/specifications/bean-validation/3.0/
           basis: Jakarta EE 9 gives the specifications of Jakarta EE 8, with almost no change of function, under the new jakarta.* namespace, as a stable target for teams and tools that migrate their applications (Jakarta EE Platform 9 specification, section on the changes in Jakarta EE 9 (Eclipse Foundation), https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html)
           basis: an import names a class by its full name, a whole package with .*, or a static member, and a fully qualified name can also be written in the code without an import (The Java Language Specification, Java SE 21, Chapter 7: Packages and Modules (Oracle), https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html)
           basis: comments, string literals and text blocks are tokens of their own, so a name written inside a comment or a string is not a reference to a class (The Java Language Specification, Java SE 21, Chapter 3: Lexical Structure (Oracle), https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html)
           the tool's own choice: a name in a comment or a string is not code and is not reported by this rule; a name that follows a dot is part of a longer name
```

The migrated example passes:

```
jakarta-migration-check: examples/migrated
input: examples/migrated (11 files: 4 java, 1 kotlin, 1 maven, 1 gradle, 1 catalog, 2 descriptor, 1 service)
config: built-in defaults: 20 file patterns, 4 exclude patterns, no added moves, no ignored names; minimum severity notice
rules: javax-import (error); javax-qualified-name (error); partly-moved-import (warning); javax-artifact (error); old-descriptor-namespace (warning); javax-name-in-text (warning); javax-service-file (warning)
findings: 0

Findings (0)

  none

Read: examples/migrated

  files          11: 4 java, 1 kotlin, 1 maven, 1 gradle, 1 catalog, 2 descriptor, 1 service
  imports        27 read; javax imports 12: 1 of javax.annotation, not moved, 11 in the JDK
  code names     javax names written out in full 1: 1 in the JDK
  texts          javax names in strings and descriptor values 0
  dependencies   8 read; 0 Java EE artifacts
  descriptors    2 read; 0 with a namespace of Java EE
  service files  1 read
  mapping        32 moved prefixes, 7 moved classes, 30 JDK prefixes, 49 artifacts, 11 namespaces; 0 added and 0 ignored by the configuration

This report lists the javax names, artifacts and descriptor namespaces it found in the files it was given, against the mapping of src/mapping.js. It does not compile the code, resolve dependencies or look inside the libraries a project uses, so a clean run does not mean the project builds and runs on Jakarta EE 9 or later (docs/limits.md).

RESULT: PASS - no error
```

## What it checks

| Rule | Key | Default level | Finds |
| --- | --- | --- | --- |
| `javax-import` | `rules.javaxImport` | error | an import in a Java or Kotlin file of a class, a package or a static member whose javax name moved |
| `javax-qualified-name` | `rules.javaxQualifiedName` | error | a javax name that moved, written out in full in the code, such as `@javax.persistence.Entity` |
| `partly-moved-import` | `rules.partlyMovedImport` | warning | `import javax.annotation.*`, of which only the classes of Jakarta Annotations moved |
| `javax-artifact` | `rules.javaxArtifact` | error | a Java EE artifact in a `pom.xml`, a Gradle build or a version catalog |
| `old-descriptor-namespace` | `rules.oldDescriptorNamespace` | warning | a deployment descriptor in a namespace of Java EE or J2EE |
| `javax-name-in-text` | `rules.javaxNameInText` | warning | a string or a descriptor value that names a javax name that moved |
| `javax-service-file` | `rules.javaxServiceFile` | warning | a file under `META-INF/services` named for, or naming, a javax class that moved |

A name in a comment or in Javadoc is never reported. [docs/method.md](docs/method.md) says exactly what each rule looks at and what it cannot see, and [docs/rules-and-sources.md](docs/rules-and-sources.md) gives the points of the public pages each rule rests on.

## What is never reported

The mapping in [src/mapping.js](src/mapping.js) lists 32 javax prefixes that moved, from `javax.servlet` to `javax.security.jacc`, the 7 classes of `javax.annotation` that moved, 49 Java EE artifacts and 11 descriptor namespaces, each with its replacement and the page it was taken from. It also lists the 30 javax prefixes of the Java SE API. A name is looked up by the longest prefix it starts with, so:

- `javax.transaction.Transactional` moves, and `javax.transaction.xa.XAResource` stays;
- `javax.security.auth.message.module.ServerAuthModule` moves, and `javax.security.auth.Subject` stays;
- `javax.xml.bind.JAXBContext` moves, and `javax.xml.parsers.DocumentBuilder` stays;
- `javax.annotation.PostConstruct` moves, and `javax.annotation.processing.Processor` stays.

`javax.crypto`, `javax.net`, `javax.naming`, `javax.sql`, `javax.swing`, `javax.management`, `javax.script`, `javax.tools`, `javax.xml.transform` and every other javax package of the JDK are never reported, as an import, a name, a string, a service file or a descriptor value. A javax name the mapping does not know, such as `javax.cache`, belongs to no Jakarta EE specification and is not reported either; the summary counts these names, and `packages` in the configuration adds a move the team knows of ([decision 3](docs/decisions/0003-report-only-what-the-mapping-knows-and-never-the-jdk.md)).

## The configuration file

```json
{
  "name": "Larkspur Books",
  "exclude": { "add": ["**/gen/**"] },
  "packages": { "javax.cache": "jakarta.cache" },
  "ignore": ["javax.annotation.PreDestroy"],
  "rules": { "javaxNameInText": "error" }
}
```

Every key is optional, and without `--config` the defaults apply. `files` and `exclude` are the file patterns of a folder walk, with `*`, `?` and `**`; `packages` adds moves for javax names the mapping does not hold; `ignore` lists javax names to leave alone; `rules` sets the level of each rule (`error`, `warning`, `notice` or `off`) and `minSeverity` the lowest level shown. A list is a JSON array that replaces the built-in list, or an object with `replace`, `add` and `remove`. A key the tool does not know is an error with its line and a suggestion, and a key named twice is refused. The configuration can add to the mapping but never change or hide an entry of it. [docs/inputs.md](docs/inputs.md) describes every key, and `--print-defaults` writes the whole default configuration out.

## Formats

- `text`: for a terminal: what was read, the configuration, the rules, the counts, the findings with the file and line, what was read by kind, the notes, the notice and the result. With `--explain` also the rule, the specification, the points of the public pages and the tool's own choice behind each finding. With `--summary` also the findings per javax package (or per old namespace), most findings first:

```
Per package

  from                                    to                                     findings  files  rules
  javax.servlet                           jakarta.servlet                        7         3      javax-artifact 1, javax-import 5, javax-service-file 1
  javax.persistence                       jakarta.persistence                    5         4      javax-artifact 1, javax-import 2, javax-name-in-text 2
  javax.ws.rs                             jakarta.ws.rs                          5         3      javax-artifact 1, javax-import 3, javax-name-in-text 1
  javax.annotation                        jakarta.annotation                     2         2      partly-moved-import 1, javax-import 1
  javax.inject                            jakarta.inject                         2         2      javax-artifact 1, javax-import 1
  javax.validation                        jakarta.validation                     2         2      javax-artifact 1, javax-qualified-name 1
  http://java.sun.com/xml/ns/persistence  https://jakarta.ee/xml/ns/persistence  1         1      old-descriptor-namespace 1
  http://xmlns.jcp.org/xml/ns/javaee      https://jakarta.ee/xml/ns/jakartaee    1         1      old-descriptor-namespace 1
  javax.faces                             jakarta.faces                          1         1      javax-name-in-text 1
  javax.transaction                       jakarta.transaction                    1         1      javax-import 1
  javax.xml.bind                          jakarta.xml.bind                       1         1      javax-artifact 1
```

- `json` (or `--json`): the whole report: the input with the kind of every file, the configuration, the summary with the counts and the findings per package, every finding with its file, line, column, the old and new package and the specification, the totals, the result, the notes and the notice.
- `github`: one workflow command per finding, `::error`, `::warning` or `::notice` with the file, line and column, which GitHub shows as an annotation in the pull request, then a summary line. The characters a command gives a meaning to are escaped. Two findings of the legacy example:

```
::error file=examples/legacy/pom.xml,line=12,col=7,title=jakarta-migration-check javax-artifact::javax.servlet:javax.servlet-api is a Java EE artifact that holds javax packages; Jakarta EE 9 and later name jakarta.servlet:jakarta.servlet-api (Jakarta Servlet 5.0)
::error file=examples/legacy/src/main/java/com/larkspur/books/web/OrderServlet.java,line=9,col=8,title=jakarta-migration-check javax-import::import javax.servlet.http.HttpServlet: moved to jakarta.servlet.http.HttpServlet (Jakarta Servlet 5.0)
```

## Exit codes

`0`: no finding at the level error. `1`: at least one finding at the level error; a rule can be raised to error or lowered to warning or notice in the configuration. `2`: a usage or input error: no path, an unknown option, an option given twice, `--summary` with a format other than text, a URL in place of a path, a file or folder that cannot be read, a symbolic link named on the command line, a folder with no file to read, a file of no kind the tool reads, a file over its limit, a binary, UTF-16 or invalid UTF-8 file, a source with a string, a comment or a template that is not closed, an XML file with a tag that is not closed or does not match, or a configuration with an unknown key, a key named twice or a value of the wrong kind. With exit code `2` the tool gives no result and prints the problems on standard error.

## Limits

The tool reads files; it does not compile the code, run the build or open the libraries a project uses. A clean run means the files it read hold none of the javax names, Java EE artifacts and old namespaces of the mapping, not that the project builds on Jakarta EE 9. It matches an artifact by group and artifact id, never by version, so an artifact of Jakarta EE 8 such as `jakarta.servlet:jakarta.servlet-api` at a 4.x version, which still holds the javax packages, is not reported. It does not read JSP pages, Groovy, property or YAML files, a Maven parent or BOM it was not given, or a name built at run time. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 4 MB for a file, 256 MB and 20,000 files for a run, 500 findings listed per rule. [docs/threat-model.md](docs/threat-model.md) lists the risks of reading a source tree from a pull request and their controls, and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the configuration and the files, runs the checks and builds the report of the run |
| `src/files.js`, `src/glob.js`, `src/kinds.js` | the bounded reading of files and folders with no link followed, the file patterns, and the kind of each file |
| `src/lexer.js`, `src/sources.js` | the lexer of Java and Kotlin, and the imports, names and strings of a source |
| `src/xml.js`, `src/builds.js` | the XML reader of pom.xml and the descriptors, and the dependencies of Maven, Gradle and version catalogs |
| `src/mapping.js` | the mapping: moved packages and classes, JDK packages, artifacts and namespaces, with the page of each |
| `src/analyse.js` | the checks of every file and the summary |
| `src/config.js`, `src/defaults.js`, `src/json.js` | the configuration file over the defaults, and its strict JSON reader |
| `src/rules.js` | the seven rules and the result |
| `src/report.js`, `src/text.js`, `src/size.js`, `src/words.js` | the text, JSON and GitHub output, the cleaning of text from the input, number formats, and names compared as names |
| `src/data.js` | the public pages and the points the checks rest on, in this project's own words |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

| Fact | Source |
| --- | --- |
| Jakarta EE 9 gives the specifications of Jakarta EE 8 under the `jakarta.*` namespace | Jakarta EE Platform 9 specification, https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html |
| Spring Boot 3 uses the jakarta packages; imports and javax dependencies change | Spring Boot wiki, https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide |
| The packages and the artifact of each specification | the page of each Jakarta EE 9 specification, such as https://jakarta.ee/specifications/servlet/5.0/, listed in [research/sources.md](research/sources.md) |
| The javax packages of the JDK | Java SE 21 API, https://docs.oracle.com/en/java/javase/21/docs/api/allpackages-index.html |
| JDK 11 removed the Java EE modules, among them the common annotations | OpenJDK, https://openjdk.org/jeps/320 |
| The artifacts exist under their group and artifact id | Maven Central, https://repo1.maven.org/maven2/ |
| The descriptor namespaces of Jakarta EE 9 and later | jakarta.ee, https://jakarta.ee/xml/ns/jakartaee/ |
| The descriptor namespaces of Java EE | xmlns.jcp.org, https://xmlns.jcp.org/xml/ns/javaee/ and https://xmlns.jcp.org/xml/ns/persistence/ |
| A namespace is declared with xmlns and compared as a string | W3C, https://www.w3.org/TR/xml-names/ |
| Comments, strings and text blocks of Java; imports and qualified names | The Java Language Specification, https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html and https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html |
| Kotlin imports with `as`, raw strings and templates | Kotlin documentation, https://kotlinlang.org/docs/packages.html and https://kotlinlang.org/docs/strings.html |
| Maven dependencies and exclusions | Apache Maven, https://maven.apache.org/pom.html |
| Gradle dependencies and version catalogs | Gradle User Manual, https://docs.gradle.org/current/userguide/declaring_dependencies.html and https://docs.gradle.org/current/userguide/version_catalogs.html |
| Service files under META-INF/services | Java SE 21 API, https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html |
| Annotations from workflow commands | GitHub Docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |
| Repeated names in a JSON object | RFC 8259, https://www.rfc-editor.org/rfc/rfc8259 |

[research/sources.md](research/sources.md) has a note on each page, in this project's own words.

## Background

The move from javax to jakarta is mostly mechanical, and the hard part is knowing where it is done: which imports, artifacts, descriptors and reflective strings are still on the old names, across many modules, without touching the javax packages that belong to the JDK. Checking the files against a mapping built from the specifications, on every pull request, turns the migration into a list that gets shorter and a pipeline that stays green once it is done. How Java applications on Jakarta EE and Spring Boot are built and moved is described on the page [Java Web Development Services](https://innerluxes.dev/web-development/java).

## License

MIT
