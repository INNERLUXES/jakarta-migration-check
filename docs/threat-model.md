# Threat model

## What the tool touches

- It reads the files and folders named on the command line and the configuration file named with `--config`. In a
  folder it opens only the files whose path matches the patterns of the configuration. Nothing else is opened.
- It writes the report to standard output and its errors to standard error. It writes nothing to disk.
- It opens no network connection, follows no symbolic link, evaluates nothing it reads, starts no program, runs no
  build and reads no clock.

## What the input may hold

The tool reads a source tree, and in a pipeline that checks every pull request, the sources, the builds, the
descriptors and the configuration may all be written by whoever opened the pull request. Through them, a person can
try to:

- make the tool read another file: a file or a folder named through a symbolic link that points at a key file, a link
  inside a folder, a file swapped for a link between the walk and the read, a path with `..` in a pattern;
- make the tool fetch something: a path written as a web address, a DOCTYPE that names an external file, an entity
  that names one;
- make a javax name pass: the name inside a comment marker that does not end where it seems to (a `*/` inside a
  string, a Kotlin comment nested in a comment), a string that hides the code after it, a template that ends a string
  early, an exclusion that looks like a dependency, a property in place of a group id, a namespace with a slash at its
  end, a name with slashes;
- move the result through the configuration: a key named twice, an unknown key that looks like a known one, a rule set
  to off, a pattern in `exclude` that leaves a module out, a name in `ignore`, a move in `packages` that hides a package
  of the mapping;
- exhaust the memory or the time: thousands of files, a file of megabytes, long runs of quotes, backslashes, comment
  openers or braces, templates inside templates, XML nested very deep or very wide, an entity that expands to billions
  of characters;
- slip in something that is not text: a binary file named `.java`, a file in UTF-16, bytes that are not UTF-8;
- rewrite the terminal or break the output: control characters, ANSI escapes, direction controls and line separators
  in a file name, a string or a descriptor value;
- start a second workflow command: a text that holds `::error`, `%`, a comma, a colon or a line break, which the
  GitHub format writes into a command;
- change how objects behave: a name, a key or a file named `__proto__`, `constructor` or `toString`.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| A symbolic link makes the tool read another file | A path named on the command line is looked at without following a link, and a link is refused; inside a folder a link is skipped and counted; each file is opened with `O_NOFOLLOW` where the system has it and its type is taken from the open handle, so a file swapped for a link is refused. A test names a file and the configuration through a link and puts links in a folder |
| The tool fetches something | No module of the network is imported; a path that looks like an address is refused; the XML reader skips the document type declaration and never reads or expands an entity, so an external entity is only text. A test checks the imports of src and reads a document type with an external file and one that would expand an entity ten billion times |
| A javax name passes | The lexer reads every form of comment, string, text block, raw string and template of Java and Kotlin, and stops the run on one that is not closed; a Kotlin comment counts the comments nested in it and a Java comment ends at the first `*/`; a template is read as code; a name with slashes is read with dots; a namespace is compared without its last slash. A test covers each form, closed and left open |
| The configuration moves the result | The JSON reader refuses a repeated key; an unknown key stops the run with its line and a suggestion; `packages` cannot change or hide a name the mapping holds; a rule set to off is named in a note; an ignored name is counted in the summary; the report lists every file read with its kind. Review a change to the configuration like a change to code (docs/secure-defaults.md) |
| The memory or the time is exhausted | Files have size limits checked on the open handle before they are read, and a run has limits on its files, its bytes and the entries it walks; the lexer reads each character once and limits its tokens and its templates; the XML reader reads each character once and limits its depth, elements and attributes; findings are capped per rule. Tests check the time, with limits that widen under coverage only |
| A pattern from the input is slow | No regular expression is built from the input or the configuration; file patterns are matched by hand with work bounded by the product of their lengths; a test looks for `new RegExp` in src |
| A binary or UTF-16 file is read as text | A null byte, a UTF-16 byte order mark or bytes that are not valid UTF-8 stop the run with exit code `2` |
| Text from the input rewrites the terminal | Every text, file names included, goes through `safeText`, which removes control, line separator and direction characters and caps the length. A test puts ANSI escapes and direction controls in a file name and a string, in every format |
| A text starts a second workflow command | The GitHub format escapes `%`, CR and LF in a message and `:` and `,` in a property; a line break never reaches a command. A test writes `::error` and `%` into a string and a comma and a colon into the file name |
| `__proto__` changes how objects behave | The JSON reader defines own properties; names are looked up in arrays and `Map`, never as keys of a plain object. A test uses `__proto__`, `constructor` and `toString` as names, files, attributes and keys |
| A device or a pipe hangs the tool | A path that is not a regular file or a folder is refused before it is read, and a walk reads regular files only |
| The tool leaves files behind | Nothing is written to disk; there is no cache, no temporary file and no log. A test checks that a run leaves the folder as it was |

## Out of scope

Whether the project builds or runs after the move, the libraries it depends on, the versions of its artifacts, the
names the mapping does not hold, who may change the sources or the configuration in your repository, and where your
pipeline keeps the output.
