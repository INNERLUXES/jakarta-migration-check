# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux, Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, with `!` for a breaking change.

## Changing the mapping

1. src/mapping.js is data, and every entry names the page it was taken from. A new moved prefix, class, artifact or namespace comes from the page of a Jakarta EE specification, its API documentation, the list of all packages of the Java SE API or the schema pages of jakarta.ee and xmlns.jcp.org; an artifact is also looked up on Maven Central by its group and artifact id. Write down in research/sources.md what the page says, in this project's own words.
2. No version is named in the mapping. An artifact is named by its group and artifact id only.
3. A javax package of the JDK is never moved. A new entry must keep test/mapping.test.js green: every javax package of the Java SE API is written out there and must never be reported ([decision 3](docs/decisions/0003-report-only-what-the-mapping-knows-and-never-the-jdk.md)).
4. Where a moved prefix and a JDK prefix hold one another, the longest prefix decides. Add a test of the names on both sides.

## Changing a rule

1. Describe the change in docs/method.md first: what the rule looks at and what it can and cannot see. Where the tool makes its own choice, say so in `own` in src/rules.js and say why.
2. Keep the rules conservative. A finding must point at something a reader can check in the file: an import, a name, a string, a dependency or a namespace on a line, and the entry of the mapping that says it moved. Never add a rule that guesses what a name means from its shape.
3. A run must never pass because something could not be read: an input that cannot be read stops the run with exit code `2`.
4. Add a test with the files written inline (`java()`, `kotlin()`, `reportOf()` and `rulesOfJava()` in test/helpers.js), small enough that the result can be worked out by hand, with a near miss on each side: the form that is reported and the form next to it that is not.
5. A rule id, once released, keeps its meaning: pipelines and other tools read it from the JSON output and the GitHub annotations.

## Changing a reader

1. The lexer reads Java and Kotlin as their specifications write the forms of comments and strings, and nothing more ([decision 2](docs/decisions/0002-read-sources-with-a-lexer-not-a-compiler.md)). A new form gets a test of the form itself and of the same form left open, which must stop the run with its line and column.
2. The XML reader never fetches, never reads a declared entity and never expands one. Keep it that way.
3. Keep the work bounded: one pass over each file, the limits of docs/limits.md, and a hostile test with a large input and a time check.

## Changing the configuration file

1. A new key is added to `KEYS` in src/config.js, documented in docs/inputs.md and tested with a good value and a bad one. Every key the tool does not know stays an error, and a key named twice stays refused.
2. A list of the configuration keeps the array form and `replace`, `add` and `remove`; removing an entry that is not there stays an error.
3. Never add a key that takes a regular expression. File patterns are matched by hand in src/glob.js.
4. The configuration may add to the mapping; it never changes or hides an entry of it.

## Changing a source

1. Every point the reports show is in src/data.js, written in this project's own words, with the page it comes from. A short phrase of a page may be named; a long quotation may not.
2. research/sources.md lists every page with a note on what it says, and docs/rules-and-sources.md lists every rule with its points. A test checks all three against each other.

## Changing a reader of files

1. The tool reads; it never follows. A symbolic link named on the command line is refused, a link inside a folder is skipped, and nothing but the files named, the files a walk matches and the configuration is opened.
2. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only when coverage is on, and allow four times the time. Never read the flags of the process for this, because they hold the coverage flags of the runner in every run. Run `npm run test:coverage` before you open the pull request.
3. A file written with LF, CRLF or CR line ends, with or without a byte order mark, must give the same output. The example files are stored as written (`.gitattributes`), and a test reads them with CRLF line ends.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device, file permissions, a character that a file name cannot hold on every system) is guarded with `process.platform`, says why in its `t.skip`, and asserts no line of its own: a line is asserted only in a test that runs on every system, and is worked out there with `lineOf()` of test/helpers.js or from the text itself, never written by hand. `test/repo.test.js` fails when a guarded test asserts a line. Every other test builds its paths with `resolve()` from names with forward slashes.

A test never reads the clock, the time zone of the machine or the locale.

## Rules for the code

- No runtime dependencies and no development dependencies. Node 22 or newer and nothing else; the tests use `node:test`.
- The tool reads the files and the configuration it is given and writes only to standard output and standard error. It opens no network connection and runs no program.
- Text from the input, file names included, goes through `safeText` before it reaches the output or an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- Never commit a real secret, even as a fixture. `npm run check` fails on anything that looks like a credential.
- No prose file carries a date, and no file holds a number that reads like a year. Version numbers (Jakarta EE 9, Spring Boot 3, Node 22, 1.0.0) are fine.
- Examples and tests use made-up projects, packages and names, never the source of a real product.
- Plain words in the documents: `npm run check` fails on a short list of words that say little.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
