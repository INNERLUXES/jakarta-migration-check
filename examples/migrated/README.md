# A migrated project

The same made-up web shop after the move: every import, annotation, string, artifact, descriptor and service file
uses the jakarta names. It still imports `javax.crypto`, `javax.naming`, `javax.sql`, `javax.transaction.xa` and the
other packages of the JDK, which keep their names, a `javax.annotation.Nonnull` of another library, which did not
move, and it names javax packages in comments and in an exclusion of its build.

The tool finds nothing in it.
