# Limits

The tool reads the files of a project and looks every javax name, artifact and descriptor namespace up in a fixed
mapping. It does not compile the code, run the build, resolve dependencies or open the libraries a project uses. A run
with no finding means the files it read hold none of the javax names, Java EE artifacts and old namespaces of the
mapping; it does not mean the project builds and runs on Jakarta EE 9 or later, or on Spring Boot 3. Every report ends
with a sentence that says so.

## What it cannot see

- **Libraries.** A library the project uses may itself be built on the javax packages, and then it needs a release of
  its own for Jakarta EE 9; the tool reads the project, not the jars it depends on. The same goes for a dependency that
  comes in through another one: only the dependencies the build files name are read.
- **Versions.** An artifact is matched by its group and artifact id, never by its version. The artifacts of
  Jakarta EE 8 already have jakarta group ids but still hold the javax packages, such as `jakarta.servlet:jakarta.servlet-api` at
  a 4.x version; the tool does not report them, because telling them apart needs the version of every artifact of
  every specification. Check that the versions the build names are those of Jakarta EE 9 or later.
- **Implementations and other artifacts.** Only the API artifacts of Java EE in the mapping are matched, not the
  implementations (a mail or JSON provider, an application server) and not the artifacts of other projects that moved
  with Jakarta EE 9; their replacement is a choice of the team.
- **Builds it does not read.** A Maven parent or BOM that the files named do not hold, a property such as
  `${servlet.group}`, a dependency declared in a Gradle plugin, a convention plugin, a `buildSrc` script written in
  another form, a dependency spread over several lines in a Gradle file, or an Ant or other build.
- **Names built at run time.** A class name joined from parts, read from a property file or an environment variable, or
  written by a build plugin, is not seen. Property files, YAML and other configuration files are not read, so a
  setting such as `spring.jpa.properties.javax.persistence.validation.mode` in `application.properties` must be checked
  by hand.
- **Code it does not read.** Groovy, Scala, JSP pages, tag files, Facelets, templates and other files are not read,
  and neither are the sources a build writes under the folders `exclude` leaves out. A JSP page that imports a javax class or a
  tag library descriptor in an old namespace is not reported.
- **Classes used without a name.** A class of the same package, or one inherited without being named, has no import
  and no full name in the file.
- **Packages Jakarta EE 9 removed.** Jakarta EE 9 removed a few old specifications instead of moving them (XML
  Registries, XML RPC, Deployment and Management among them); their javax names have no jakarta form and are not in
  the mapping, so they are not reported.
- **Javax names of other libraries.** A javax package that belongs to no Jakarta EE specification, such as
  `javax.cache` or `javax.money`, is not reported; the summary counts these names. `packages` in the configuration adds
  a move the team knows of.
- **The schema location and version of a descriptor.** The finding of an old namespace says that the schema location
  and the `version` attribute change with it; the tool does not check them, or the content of the descriptor against
  its schema.
- **What a string means.** A javax name inside a string may be a class name, a property name or only words. All three
  are reported as a warning, and the tool cannot tell which one it is.
- **The source forms the lexer does not know.** The lexer knows the comments, strings, text blocks, raw strings and
  templates of Java and Kotlin. A source that holds a string, a comment or a template that is not closed stops the
  run; it does not judge a file it could not place. Unicode escapes such as `.` in a name are not decoded.

## Size limits

Past a limit, the input is refused with exit code `2` and no result, or, where the limit is on the work and not the
input, the report says so in a note.

| What | Limit |
| --- | --- |
| a file | 4 MB |
| all the files of a run | 256 MB |
| files read in a run | 20,000 |
| files and folders looked at in a walk | 200,000 |
| folders nested in a walk | 32 deep |
| paths on the command line | 100 |
| tokens of one source | 4,000,000 |
| Kotlin templates inside each other | 64 |
| XML | elements nested 256 deep, 1,000,000 elements, 256 attributes in a tag |
| configuration file | 1 MB; nesting 32 deep; 500 entries in a list; 200 characters for an entry or a file pattern; 200 added moves |
| findings of one rule | 500 listed; the rest are counted in a note and still count for the result |
| problems of the input | 20 listed; the rest are counted |

The tests read a thousand files of a hundred imports, runs of hundreds of thousands of quotes, backslashes, comment
openers and braces, XML nested a hundred thousand deep or two hundred thousand elements wide, a document type that
would expand an entity ten billion times if it were expanded, and a hundred broken files, each with a time check.
