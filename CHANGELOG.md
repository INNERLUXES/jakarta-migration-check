# Changes

## 1.0.0

First release.

- Reads a Java or Kotlin project, from one folder, several folders or single files, and reports what still uses the javax names that moved to jakarta in Jakarta EE 9, the move Jakarta EE 9 and later and Spring Boot 3 need.
- Seven rules: `javax-import`, `javax-qualified-name`, `partly-moved-import`, `javax-artifact`, `old-descriptor-namespace`, `javax-name-in-text` and `javax-service-file`, each with a level of its own (`error`, `warning`, `notice` or `off`) and the points of the public pages it rests on.
- A mapping in src/mapping.js, taken from the pages of the Jakarta EE 9 specifications: 32 moved javax prefixes with their jakarta prefix and specification, the 7 classes of `javax.annotation` that moved, the 30 javax prefixes of the Java SE API that stay, 49 API artifacts of Java EE with the artifact that replaces each, and 11 descriptor namespaces of Java EE with the one that replaces each. A name is looked up by its longest prefix, and a javax package of the JDK is never reported.
- A lexer for Java and Kotlin that knows comments (nested in Kotlin), strings, character literals, Java text blocks, Kotlin raw strings and templates, and reads imports (single, on demand, static, with an alias), fully qualified names and the javax names inside strings.
- pom.xml dependencies in `dependencies`, `dependencyManagement` and plugins, with exclusions and properties left alone; Gradle builds in the Groovy and the Kotlin DSL and version catalogs, line by line, with comments, exclusions and substitutions left alone.
- Deployment descriptors (`web.xml`, `persistence.xml`, `beans.xml`, `faces-config.xml`, `ejb-jar.xml` and the others) read by a small XML reader that never fetches or expands an entity, for their namespaces and for javax names in their values; and the service files of `META-INF/services`.
- A configuration file in strict JSON over documented defaults: the file patterns of a folder, the files left out, moves to add, names to leave alone, the level of every rule and the minimum severity; a key the tool does not know is an error with its line and a suggestion, and a key named twice is refused.
- Reports as text, JSON and GitHub workflow commands (`--format github`) that show each finding as an annotation on the file, line and column, `--summary` for the findings per javax package, `--min-severity` to hide the findings below a level, and `--explain` to show the rule, the specification and the sources behind each finding. Exit code `0` when no finding is at the level error, `1` when one is, `2` for a usage or input error, with no result.
- Follows no symbolic link, fetches nothing, runs no build, writes nothing to disk, and refuses binary, UTF-16 and invalid UTF-8 input; every input has a size limit.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate of the repository.
