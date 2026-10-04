# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which files you give it, where the output goes, and who may
change the configuration.

## How the tool behaves by default

- **Reads, never follows.** The tool reads the files and folders it is given and the configuration named with
  `--config`. It follows no symbolic link, fetches no web address, refuses an argument that looks like an address,
  expands no XML entity, runs no build, starts no program and writes nothing to disk.
- **Every rule on from the first run.** A moved import, a fully qualified name and a Java EE artifact are errors; an
  import of `javax.annotation.*`, an old descriptor namespace, a javax name in a string and a service file are
  warnings.
- **Never the JDK.** The javax packages of the Java SE API are part of the mapping and are never reported, so the run
  does not push a team to rename `javax.crypto` or `javax.sql`
  ([decision 3](decisions/0003-report-only-what-the-mapping-knows-and-never-the-jdk.md)).
- **Fail closed on what it cannot read.** An input that cannot be read stops the run with exit code `2` and no result:
  a missing file, a link, a folder with nothing to read, a file of no kind the tool reads, a file over its limit, a
  binary file, UTF-16, bytes that are not UTF-8, a string, a comment or a template that is not closed in a source, an
  XML tag that is not closed or does not match.
- **Unknown keys are errors.** A key in the configuration that the tool does not know stops the run, with its line and
  a suggestion, so a typo such as `exlude` cannot leave a default in place. A key named twice stops the run.
- **The mapping is fixed.** The configuration can add moves for names the mapping does not hold, and leave names alone,
  but it cannot change or hide a name of the mapping.
- **No regular expression from the input.** No pattern is built from the files or the configuration; file patterns
  are matched by hand, and the lexer and the XML reader read each character once.
- **No prototype tricks.** Objects are built with own properties, and names are looked up in arrays and `Map`, so
  `__proto__` is only a name.
- **Clean output.** Text from the input, file names included, has control characters, line separators and direction
  controls removed and its length capped before it reaches a report or an error message. The GitHub format escapes
  `%`, CR and LF in a message and also `:` and `,` in a property, so a text cannot end a workflow command early or
  start another one.
- **The same input gives the same output.** No clock, no zone, no locale and no random number; folders are walked in
  the order of their names by code unit, and case is changed for the letters A to Z only
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`"rules": { "javaxNameInText": "error", "javaxServiceFile": "error" }`.** A string or a service file that still
  names a moved class fails the run, for a project that loads classes by name.
- **`"rules": { "oldDescriptorNamespace": "error", "partlyMovedImport": "error" }`.** Every descriptor and every
  `javax.annotation.*` must be moved before the run passes.
- **`"exclude": []`.** The build output is read too, for a project that keeps sources written by the build under `build` or
  `target` and commits them.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: Jakarta migration check
    run: npx --yes github:INNERLUXES/jakarta-migration-check . --format github
```

- Run it on the root of the repository, so the sources, the builds and the descriptors are read together, or on each
  module that moves.
- Give the job read access to the contents and nothing more. The tool needs no secret.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Do not hide the exit code with a trailing `|| true`. While a migration is under way, lower a rule to `warning` in the
  configuration instead, and raise it back when the module is done.

## Protecting the configuration

The configuration decides which files are read and which names are left alone. Keep it in the repository, put its
path in `CODEOWNERS` with the people who own the migration, and require their review in branch protection. Review a
change that adds a pattern to `exclude`, narrows `files`, adds a name to `ignore`, adds a move to `packages`, or sets a
rule to off or lower like a change to code: each of them can let a javax name pass.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
