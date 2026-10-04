// The built-in configuration: the files read in a folder, the files left out, the extra moves and the names left alone,
// and the level of every rule. docs/inputs.md describes every key, and --print-defaults writes all of this out.

// The deployment descriptors that are read for their namespace and for the javax names in their values.
export const DESCRIPTORS = ['web.xml', 'web-fragment.xml', 'beans.xml', 'faces-config.xml', 'ejb-jar.xml', 'application.xml', 'application-client.xml', 'persistence.xml', 'orm.xml', 'validation.xml', 'batch.xml', 'ra.xml', 'permissions.xml'];

// The files read in a folder named on the command line: Java and Kotlin sources, Maven and Gradle builds, Gradle
// version catalogs, the descriptors above and the service files of ServiceLoader.
export const DEFAULT_FILES = ['**/*.java', '**/*.kt', '**/*.kts', '**/pom.xml', '**/*.gradle', '**/*.versions.toml', ...DESCRIPTORS.map((d) => `**/${d}`), '**/META-INF/services/*'];

// The build output of Maven and Gradle at the top of the folder and one module down, where the files the build writes
// and copies would repeat the findings of the sources.
export const DEFAULT_EXCLUDE = ['target/**', '*/target/**', 'build/**', '*/build/**'];

// Folders a walk never enters.
export const SKIPPED_FOLDERS = ['.git', 'node_modules', '.gradle', '.idea', '.mvn'];

// Moves the configuration adds to the mapping, as { "javax.name": "jakarta.name" }. None by default.
export const DEFAULT_PACKAGES = {};

// javax names the configuration says to leave alone. None by default.
export const DEFAULT_IGNORE = [];

export const DEFAULT_RULES = {
  javaxImport: 'error',
  javaxQualifiedName: 'error',
  partlyMovedImport: 'warning',
  javaxArtifact: 'error',
  oldDescriptorNamespace: 'warning',
  javaxNameInText: 'warning',
  javaxServiceFile: 'warning'
};

// The lowest level of a finding that is shown.
export const DEFAULT_MIN_SEVERITY = 'notice';
