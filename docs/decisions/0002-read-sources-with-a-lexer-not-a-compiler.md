# 2. Read sources with a lexer, not a compiler

## Status

Accepted

## Context

The surest way to find every use of a javax class would be to compile the project and look at the classes each file
uses. That needs the whole build: the right JDK, every dependency downloaded, the Maven or Gradle setup of the
project, the sources the build writes, and often a network. It would make the tool slow and heavy, tie it to one build tool, run
the build scripts of whoever opened a pull request, and fail on exactly the projects that are half migrated and do not
build yet.

A plain text search for `javax.` is the other end: fast, but it reports names in comments and Javadoc, cannot tell an
import from a string, and reports `javax.crypto` and `javax.sql` along with `javax.servlet`.

The names that move are written in a few places only: the imports, fully qualified names in the code, string
literals, the build files and the descriptors. Finding them needs to know where a comment or a string starts and ends,
and nothing more.

## Decision

1. Java and Kotlin sources are read by a small lexer that knows the comments, strings, character literals, Java text
   blocks, Kotlin raw strings and Kotlin templates, and drops the comments. It does not parse expressions or types.
2. Imports, the package declaration, fully qualified names and strings are found in the tokens, as docs/method.md
   says.
3. A file the lexer cannot place, such as one with a string or a comment that is not closed, stops the run with its
   line and column. The tool never judges a file past a place it could not read.
4. pom.xml and the descriptors are read by a small XML reader that never fetches or expands anything; Gradle builds and
   version catalogs are read line by line for quoted coordinates.
5. Every name is looked up in the mapping of src/mapping.js; nothing is guessed from the shape of a name.

## Consequences

- The tool runs in a second on a large project, needs no JDK and no network, and reads a project that does not build.
- It cannot see a class used without a name in the file, a name built at run time, or a dependency that the build
  files do not name; docs/limits.md lists these.
- A comment, a string or a template in a form the lexer does not know would stop the run rather than be passed over.
  New forms of the languages are added to the lexer with a test of the form closed and left open.
