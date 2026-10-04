# Method

This document says exactly what the tool reads, how it reads each kind of file, how a name is looked up in the
mapping, and what each rule looks at and cannot see. The names used here are the defaults; docs/inputs.md says how the
configuration changes them.

## What is read

The input is one or more paths and, if given, a configuration file. A file named on the command line is read whatever
its name, as long as it is of a kind the tool reads. A folder is walked: its files and subfolders in the order of their
names (compared by code unit, so the order does not depend on the locale), `.git`, `node_modules`, `.gradle`, `.idea`
and `.mvn` left out, symbolic links skipped and counted in a note, and the files whose path relative to the folder
matches a pattern of `files` and none of `exclude` are read. By default `exclude` leaves out `target` and `build` at
the top of the folder and one module down, where Maven and Gradle write and copy files.

Each file is read as UTF-8, with or without a byte order mark, with LF, CR LF or CR line ends. A file that is binary,
UTF-16 or not valid UTF-8, a path that is a symbolic link, a device or a pipe, a folder with no file that matches, a
file over 4 MB and a file of no kind the tool reads stop the run with exit code `2`, so a run never passes because
something could not be read.

## The kinds of files

The kind of a file comes from its path:

| Kind | Path |
| --- | --- |
| `java` | a name that ends in `.java` |
| `kotlin` | a name that ends in `.kt`, or in `.kts` but not `.gradle.kts` |
| `gradle` | a name that ends in `.gradle` or `.gradle.kts` (the Groovy and the Kotlin DSL) |
| `catalog` | a name that ends in `.versions.toml`, such as `gradle/libs.versions.toml` |
| `maven` | `pom.xml` |
| `descriptor` | `web.xml`, `web-fragment.xml`, `beans.xml`, `faces-config.xml`, `ejb-jar.xml`, `application.xml`, `application-client.xml`, `persistence.xml`, `orm.xml`, `validation.xml`, `batch.xml`, `ra.xml` or `permissions.xml` |
| `service` | a file directly inside a folder `META-INF/services` |

Names are compared without regard to the case of the letters A to Z.

## Java and Kotlin sources

A source is read by a small lexer, once, left to right, as the Java Language Specification and the Kotlin
documentation describe the forms ([decision 2](decisions/0002-read-sources-with-a-lexer-not-a-compiler.md)). It keeps
names, string literals and single punctuation characters and drops comments, so a javax name in a comment or in Javadoc
is never reported. It knows:

- line comments and block comments; in Kotlin a block comment may hold other block comments, in Java the first `*/`
  ends it;
- string literals with their escapes, character literals, Java text blocks in triple quotes and Kotlin raw strings in
  triple quotes, where a run of more than three quotes ends with the last three;
- Kotlin template expressions `${...}`, whose code is read as code, with the braces inside it counted, to any depth up
  to 64 templates inside each other;
- Kotlin names in backticks.

A string, a character literal, a comment or a template that is not closed stops the run with its line and column. The
tool does not parse the code further than that. From the tokens it takes:

- **Imports.** In Java, `import` that follows nothing, a semicolon or a closing brace; in Kotlin, `import` at the start
  of a line. Then `static` in Java, and a dotted name, with `.*` for every name of a package. A Kotlin alias after `as`
  is read past.
- **The package declaration**, which is passed over: a project of its own in a javax package is not an import.
- **Fully qualified names.** The name `javax` that does not follow a dot and is followed by a dot and a name, with the
  parts after it, outside the imports and the package declaration: `@javax.persistence.Entity`,
  `javax.servlet.http.HttpServletRequest request`. A name that follows a dot, such as `com.javax.Thing`, is part of a
  longer name.
- **Strings.** Every javax name inside the text of a string literal: `javax` at the start of the text or after a
  character that cannot be part of a name, then a dot or a slash and at least one more part. A name written with
  slashes, as in a resource path, is read with dots.

## The mapping

Every name is looked up in src/mapping.js by the longest prefix it starts with, at a dot. The mapping holds:

- **Moved prefixes**: 32 javax prefixes, each with its jakarta prefix and the Jakarta EE 9 specification it belongs to,
  from `javax.servlet` to `javax.security.jacc`. A prefix covers its subpackages and the classes in them.
- **The partly moved package** `javax.annotation`: only seven classes moved, `PostConstruct`, `PreDestroy`,
  `Resource`, `Resources`, `Priority`, `ManagedBean` and the annotation that marks code a tool wrote, with the packages `javax.annotation.security` and
  `javax.annotation.sql`. Every other name under `javax.annotation`, such as the `Nonnull` of other libraries, stays.
- **JDK prefixes**: every javax package of the Java SE API, 30 prefixes from `javax.accessibility` to `javax.xml.xpath`,
  including `javax.annotation.processing`, `javax.transaction.xa`, `javax.security.auth` and `javax.xml`.
- **Artifacts** and **namespaces**, below.

The longest prefix decides, so `javax.transaction.Transactional` moves while `javax.transaction.xa.XAResource` stays,
and `javax.security.auth.message` moves while `javax.security.auth.Subject` stays. A name is one of: moved, with the
name that replaces it (the jakarta prefix and the rest of the name); in the partly moved package; of the JDK; ignored
by the configuration; or unknown. Only a moved name is reported. A javax name the mapping does not know, such as
`javax.cache` or `javax.money`, belongs to no Jakarta EE specification and is never reported
([decision 3](decisions/0003-report-only-what-the-mapping-knows-and-never-the-jdk.md)); the report counts these names
under "not in the mapping".

The configuration can add moves (`packages`) and leave names alone (`ignore`). An added move is matched like a built-in
one; an ignored name wins over a moved prefix of the same length and loses to a longer one.

## Maven, Gradle and version catalogs

- **pom.xml** is read as XML. Every `<dependency>` element, wherever it is (`<dependencies>`, `<dependencyManagement>`,
  the dependencies of a plugin), with its own `<groupId>` and `<artifactId>` children, is a dependency. An
  `<exclusion>` is not a dependency. A group or artifact id that holds a property such as `${ee.group}` is passed over,
  since the tool does not resolve properties.
- **Gradle builds and version catalogs** are read line by line, with `//` and `/* */` comments taken out (and `#`
  comments in a catalog). A quoted string of the form `group:artifact`, followed by up to three more parts (version,
  classifier, extension), is a dependency; so is a group and a name given as named values on one line (`group:
  'x', name: 'y'`, `group = "x", name = "y"`); a catalog's `module = "group:artifact"` is a string of the first form. A
  line that names `exclude`, `substitute`, `substitution` or `replacedBy` is passed over: naming the old artifact
  there is how a build keeps it out.

The group and artifact id of a dependency are compared with the 49 API artifacts of Java EE and Jakarta EE 8 in the
mapping, such as `javax.servlet:javax.servlet-api` or `javax.xml.bind:jaxb-api`. The version is never read.

## Descriptors

A descriptor is read as XML by the same reader as pom.xml: elements, attributes, text and CDATA, with the five entities
of XML and character references decoded. Comments, processing instructions and the document type declaration are
skipped; a declared entity is never expanded and nothing is fetched. A tag or an element that is not closed, an end tag
that does not match, an attribute without quotes or named twice in one tag, text outside the root and a second root
element stop the run with their line and column. From the tree it takes:

- every `xmlns` and `xmlns:prefix` attribute of every element, compared as a string, without a slash at its end, with
  the 11 old namespaces of the mapping;
- every attribute value other than the namespaces and `xsi:schemaLocation`, and every text, for javax names, read as
  in a string.

## Service files

A file under `META-INF/services` is read as ServiceLoader reads it: one provider class per line, `#` starting a comment,
spaces around a name dropped. Its own name, the service, and each provider are looked up in the mapping.

## The rules

### `javax-import`

An import of a Java or Kotlin file whose name, by the longest prefix, moved: a single class, a static member, or every
name of a package (`.*`). The finding gives the import as written, the name that replaces it and the specification, on
the line and column of the name. An import of the partly moved package as a whole is the next rule; an import of one
of its classes that moved is this rule; an import of one that stayed, or of the JDK, is nothing.

It cannot see a class that is used without an import or a full name, such as one in the same package, or a name
that a build plugin or a code generator writes later.

### `javax-qualified-name`

A fully qualified name in the code of a Java or Kotlin file, outside the imports and the package declaration, that
moved: an annotation such as `@javax.validation.constraints.NotNull`, a type, a static call. The code of a Kotlin
template counts as code.

It cannot see a name built at run time, such as `"javax." + "servlet"`.

### `partly-moved-import`

`import javax.annotation.*` in Java or Kotlin. Some names of `javax.annotation` moved with Jakarta Annotations and
some belong to other libraries; without compiling the file the tool cannot tell which the file uses, so the finding is
a warning that names the classes that moved. Import them by name from `jakarta.annotation`.

### `javax-artifact`

A dependency of a pom.xml, a Gradle build or a version catalog whose group and artifact id are an API artifact of Java
EE that holds javax packages. The finding names the artifact of Jakarta EE 9 and later that replaces it, by group and
artifact id; the version to use is the one of the platform the project moves to.

It cannot see a dependency that comes in through another library, a Maven parent or a BOM it does not read, a
dependency whose group or artifact id is a property, or an artifact of Jakarta EE 8 such as
`jakarta.servlet:jakarta.servlet-api` at a version that still holds the javax packages (docs/limits.md).

### `old-descriptor-namespace`

An `xmlns` or `xmlns:prefix` attribute of a descriptor whose value is one of the old namespaces:
`http://java.sun.com/xml/ns/j2ee`, `http://java.sun.com/xml/ns/javaee`, `http://xmlns.jcp.org/xml/ns/javaee`, the two
persistence namespaces and their `orm` forms, and the two Bean Validation configuration and mapping namespaces. The
finding names the namespace of Jakarta EE 9 and later. The schema location and the `version` attribute change with it;
the tool does not check them.

### `javax-name-in-text`

A string literal of a Java or Kotlin file, or a text or an attribute value of a descriptor, that holds a javax name
that moved. Such a string may be a class name loaded by reflection, a property name such as
`javax.persistence.jdbc.url`, a context parameter such as `javax.faces.PROJECT_STAGE`, or only words; the tool cannot
tell which, so the finding is a warning. Two names in one string are two findings.

### `javax-service-file`

A file under `META-INF/services` named for a javax service that moved: ServiceLoader looks for the file under the
jakarta name, so the file must be renamed. Also a line of a service file that names a provider class that moved. Both
are warnings, because the compiler does not see these files.

## The result

The findings are sorted by level (errors first), then by the order of the files, then by line, column and rule. The
run fails when a finding is at the level error; a warning or a notice alone does not fail it. A rule's level is set in
the configuration, or the rule is turned off. Findings below `--min-severity` are counted in a note and do not count
for the result. Each rule lists at most 500 findings; the rest are counted in a note and still count for the result.

The summary counts the files by kind, the imports read, the javax names seen in imports, in the code and in texts by
what the mapping says of them, the dependencies read and the Java EE artifacts among them, the descriptors with an old
namespace, the service files and the size of the mapping. It also counts the findings per javax package (or per old
namespace), most findings first, which `--summary` shows as a table and the JSON report always holds as
`summary.packages`. An artifact is counted under the package of its specification.
