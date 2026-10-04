// The seven rules and the result. Each rule names the points of the public pages it rests on (src/data.js), and says
// where it is the tool's own choice; docs/method.md says exactly what each rule looks at and what it cannot see. A rule
// whose level is "off" is not reported. The checks themselves are in src/analyse.js.

import { LEVELS } from './data.js';
import { plural } from './size.js';

export const RULES = [
  {
    id: 'javax-import',
    key: 'javaxImport',
    title: 'an import of a javax name that moved to jakarta',
    basis: ['namespaceChange', 'springBootPackages', 'importDeclarations', 'kotlinImports'],
    own: 'only the names of the mapping are reported: a javax name that moved, never one of the JDK and never one the mapping does not know; a static import and an import with as are read like any other',
    rule: () => 'an import in a Java or Kotlin file of a class, a package (.*) or a static member whose javax name moved to jakarta in Jakarta EE 9, by the longest prefix of the mapping'
  },
  {
    id: 'javax-qualified-name',
    key: 'javaxQualifiedName',
    title: 'a javax name that moved, written out in full in the code',
    basis: ['namespaceChange', 'importDeclarations', 'lexicalStructure'],
    own: 'a name in a comment or a string is not code and is not reported by this rule; a name that follows a dot is part of a longer name',
    rule: () => 'a fully qualified javax name in the code of a Java or Kotlin file, such as @javax.persistence.Entity, that moved to jakarta, outside the imports and the package declaration'
  },
  {
    id: 'partly-moved-import',
    key: 'partlyMovedImport',
    title: 'an import of every name of a javax package of which only some names moved',
    basis: ['removedFromJdk', 'importDeclarations'],
    own: 'javax.annotation is shared: the classes of Jakarta Annotations moved, while other libraries keep names of their own there; without compiling the file the tool cannot tell which ones it uses, so this is a warning',
    rule: () => 'an import of javax.annotation.* (every name of the package), of which only the seven classes of Jakarta Annotations, such as PostConstruct, PreDestroy and Resource, moved to jakarta.annotation'
  },
  {
    id: 'javax-artifact',
    key: 'javaxArtifact',
    title: 'a build that declares a Java EE artifact with javax packages',
    basis: ['springBootPackages', 'pomDependencies', 'gradleNotation', 'versionCatalog', 'centralCoordinates'],
    own: 'an artifact is matched by its group and artifact id, never by its version, and the replacement is named the same way; an exclusion, a substitution and a value built from a property are not read as a dependency',
    rule: () => 'a dependency of a pom.xml, a Gradle build or a version catalog whose group and artifact id are an API artifact of Java EE that holds javax packages'
  },
  {
    id: 'old-descriptor-namespace',
    key: 'oldDescriptorNamespace',
    title: 'a deployment descriptor in a namespace of Java EE',
    basis: ['jakartaNamespace', 'oldNamespaces', 'persistenceNamespaces', 'xmlnsAttribute'],
    own: 'a warning and not an error, because whether a runtime still reads a descriptor of an older version depends on the runtime; the namespace is compared as a string, without a slash at its end',
    rule: () => 'an xmlns or xmlns:prefix attribute of a deployment descriptor (web.xml, persistence.xml, beans.xml, faces-config.xml and the others of docs/method.md) whose value is a namespace of Java EE or J2EE'
  },
  {
    id: 'javax-name-in-text',
    key: 'javaxNameInText',
    title: 'a string or a descriptor value that names a javax name that moved',
    basis: ['namespaceChange', 'lexicalStructure', 'kotlinStrings'],
    own: 'a string may name a class to load by reflection, a property such as javax.persistence.jdbc.url or only words; the tool cannot tell which, so this is a warning; a name written with slashes is read with dots',
    rule: () => 'a string literal of a Java or Kotlin file, or a text or an attribute value of a deployment descriptor, that holds a javax name that moved to jakarta'
  },
  {
    id: 'javax-service-file',
    key: 'javaxServiceFile',
    title: 'a ServiceLoader file named for, or naming, a javax name that moved',
    basis: ['serviceFiles', 'namespaceChange'],
    own: 'a warning, like a string: the file is read by ServiceLoader at run time, so the compiler does not see it',
    rule: () => 'a file under META-INF/services whose name is a javax service that moved to jakarta, or a line of it that names a javax provider class that moved'
  }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

// True when a level is at or above another.
export const atOrAbove = (level, min) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

// The result: the run fails when a finding is at the level error. { pass, errors, byLevel, text }.
export function decide(findings) {
  const byLevel = { error: 0, warning: 0, notice: 0 };
  for (const f of findings) byLevel[f.level] += 1;
  const below = ['warning', 'notice'].filter((l) => byLevel[l]).map((l) => plural(byLevel[l], l));
  const text = byLevel.error ? `FAIL - ${plural(byLevel.error, 'error')}${below.length ? ` (and ${below.join(', ')})` : ''}` : `PASS - no error${below.length ? ` (${below.join(', ')})` : ''}`;
  return { pass: byLevel.error === 0, errors: byLevel.error, byLevel, text };
}
