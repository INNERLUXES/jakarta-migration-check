# 3. Report only what the mapping knows, and never the JDK

## Status

Accepted

## Context

Not every javax package moved. The Java SE API still holds many javax packages, such as `javax.crypto`, `javax.net`,
`javax.naming`, `javax.sql`, `javax.security.auth`, `javax.swing`, `javax.transaction.xa` and
`javax.annotation.processing`, and they keep their names in every version of the JDK. Some packages of Java EE sit
right next to them: `javax.transaction` moved while `javax.transaction.xa` stayed; `javax.security.auth.message` moved
while `javax.security.auth` stayed; a few classes of `javax.annotation` moved while `javax.annotation.processing` and
the annotations of other libraries stayed. Other libraries also use javax names that have nothing to do with Jakarta
EE, such as `javax.cache` or `javax.money`.

A tool that reported every javax name, or every javax name it did not know to be safe, would push teams to rename
packages that must not be renamed, and a rename of `javax.crypto` breaks the build. A tool that guesses from a prefix
would get the neighbours above wrong.

## Decision

1. The mapping of src/mapping.js lists, from the pages of the Jakarta EE 9 specifications, every javax prefix that
   moved, the classes of `javax.annotation` that moved, and, from the list of all packages of the Java SE API, every
   javax package of the JDK.
2. A name is looked up by the longest prefix it starts with, at a dot. Only a name whose longest prefix moved is
   reported.
3. A javax name the mapping does not know is never reported. The summary counts these names, and the configuration
   can add a move the team knows of with `packages`, but cannot change or hide a name of the mapping.
4. A test writes out every javax package of the Java SE API as an import, a wildcard import, a fully qualified name, a
   string, a name with slashes, a service line and a descriptor value, and checks that none of them is reported.

## Consequences

- A finding always names its replacement and the specification it comes from, and it is never about the JDK.
- A javax package of Jakarta EE that the mapping missed would not be reported; the summary shows the count of names
  not in the mapping so a team can look at them.
- A new version of the Java SE API with a new javax package would need a new entry in the JDK list; until then such a
  package is unknown, and so not reported either.
