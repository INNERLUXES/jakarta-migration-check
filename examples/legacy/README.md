# A legacy project

A made-up web shop, Larkspur Books, as it was before the move to Jakarta EE: a Maven war with a servlet, a JPA entity
and a configuration class in Java, a reports module in Kotlin built with Gradle and a version catalog, a `web.xml` and
a `persistence.xml` in the namespaces of Java EE, and a service file of the servlet container. It holds one problem of
every kind: imports of javax packages that moved, a static import, an import of every name of `javax.annotation`, a
fully qualified annotation, a class name and a property name in strings, Java EE artifacts in the pom, the Gradle
build and the catalog, old descriptor namespaces, a context parameter and a property named with javax, and a service
file named for a javax interface.

It also holds what must not be reported: imports of `javax.crypto`, `javax.naming`, `javax.sql`,
`javax.transaction.xa` and the other packages of the JDK, javax names in comments, an exclusion of the old activation
jar, a dependency that is only in a comment, and a class written by the build that `examples/config.json` leaves out.
