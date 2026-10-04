# Inputs

## The project

```
jakarta-migration-check <file-or-folder>... [--config <file>] [options]
```

One or more paths, up to 100: folders, or single files of the kinds of docs/method.md, or both. A folder is walked and
the files that match `files` and not `exclude` are read; a file named directly is read whatever its path, as long as it
is of a kind the tool reads. Each path may be named once. Name the root of the project to read the sources, the
builds and the descriptors together, or name single modules or files.

```
jakarta-migration-check .
jakarta-migration-check services/orders services/billing --config migration.json
jakarta-migration-check src/main/java/com/example/web/OrderServlet.java
```

## Options

| Option | Value |
| --- | --- |
| `--config <file>` | the configuration file below; without it the defaults apply |
| `--format <name>` | `text` (the default), `json` or `github` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | `notice`, `warning` or `error`: the lowest level of a finding that is shown; it wins over `minSeverity` of the configuration |
| `--explain` | each finding also shows its rule, the page of its Jakarta EE specification, the points of the public pages it rests on and the tool's own choice |
| `--summary` | the text report also shows the findings per javax package; with `--format json` or `github` it is a usage error, since the JSON report always holds `summary.packages` |
| `--print-defaults` | prints the built-in configuration as a configuration file and exits |
| `--help`, `--version` | the usage, the version |

A path that looks like a web address, an option given twice, `-` for standard input and an unknown option are usage
errors with exit code `2`.

## The configuration file

The configuration is one JSON object, read strictly as RFC 8259 writes JSON: no comments, no trailing comma, and no
name given twice in one object. Every key is optional. A key the tool does not know is an error with its line and, when
it is close to a known key, a suggestion; a run never goes on with a typo left in place.

```json
{
  "name": "Larkspur Books",
  "exclude": { "add": ["**/gen/**"] },
  "packages": { "javax.cache": "jakarta.cache" },
  "ignore": ["javax.annotation.PreDestroy"],
  "rules": { "javaxNameInText": "error" },
  "minSeverity": "notice"
}
```

A list is either a JSON array, which replaces the built-in list, or an object with `replace`, `add` and `remove`,
applied in that order. Removing an entry that is not on the list, adding one that is, and naming one twice are errors.

### `name`

A name for the configuration, 1 to 120 characters, shown in the report next to the file.

### `files`

The file patterns of a folder walk. A pattern is a relative path with forward slashes in which `*` matches any run of
characters inside one name, `?` one character, and `**` as a whole part any number of folders; a pattern with no slash
matches the file name in any folder. Character classes, braces, a backslash, `..`, an empty part and a leading slash
are refused. The default:

```
**/*.java, **/*.kt, **/*.kts, **/pom.xml, **/*.gradle, **/*.versions.toml, **/web.xml, **/web-fragment.xml,
**/beans.xml, **/faces-config.xml, **/ejb-jar.xml, **/application.xml, **/application-client.xml,
**/persistence.xml, **/orm.xml, **/validation.xml, **/batch.xml, **/ra.xml, **/permissions.xml,
**/META-INF/services/*
```

A pattern that matches a file of no kind the tool reads makes that file an input error, so a pattern cannot pass a
file over in silence. `files` must keep at least one pattern.

### `exclude`

The file patterns a walk leaves out, in the same form. The default, `target/**`, `*/target/**`, `build/**` and
`*/build/**`, leaves out the build output of Maven and Gradle at the top of the folder and one module down. A package
named `build` deep in a source tree is still read. A file named directly on the command line is read even when it
matches `exclude`.

### `packages`

Moves to add to the mapping: an object whose keys are javax names and whose values are the jakarta names they moved
to, such as `{ "javax.cache": "jakarta.cache" }` for a library of the team's own that made the same move. A name must
be a dotted Java name that starts with `javax.` (or `jakarta.` for the value) and holds at most 200 characters, at most
200 names. A name the mapping already holds, moved or of the JDK, is an error: the mapping of src/mapping.js is not
changed through the configuration. The default is `{}`.

### `ignore`

javax names the tool leaves alone, such as `javax.annotation.PreDestroy` while a library the code extends still needs it. A name
covers the names under it, like a prefix of the mapping, and wins over a moved prefix of the same length; a longer
moved prefix still wins. Each entry is a dotted name that starts with `javax.`. The default is `[]`. An ignored name is
counted in the summary.

### `rules`

The level of each rule: `error`, `warning`, `notice` or `off`. A rule set to `off` is not reported and is named in a
note of the report.

| Key | Rule | Default |
| --- | --- | --- |
| `rules.javaxImport` | `javax-import` | error |
| `rules.javaxQualifiedName` | `javax-qualified-name` | error |
| `rules.partlyMovedImport` | `partly-moved-import` | warning |
| `rules.javaxArtifact` | `javax-artifact` | error |
| `rules.oldDescriptorNamespace` | `old-descriptor-namespace` | warning |
| `rules.javaxNameInText` | `javax-name-in-text` | warning |
| `rules.javaxServiceFile` | `javax-service-file` | warning |

### `minSeverity`

The lowest level of a finding that is shown: `notice` (the default), `warning` or `error`. `--min-severity` wins over
it. A finding below it is counted in a note and does not count for the result.

## Limits of the input

| What | Limit |
| --- | --- |
| a file | 4 MB |
| all the files of a run | 256 MB |
| files read in a run | 20,000 |
| files and folders looked at in a walk | 200,000 |
| folders nested in a walk | 32 deep |
| paths on the command line | 100 |
| configuration file | 1 MB; 500 entries in a list; 200 characters for an entry or a file pattern; 200 added moves |

docs/limits.md lists the limits of the readers and of the report.
