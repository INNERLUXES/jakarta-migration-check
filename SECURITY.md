# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "jakarta-migration-check security", or use private vulnerability reporting on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up project or file and configuration that show the problem, the command you ran, what you expected and what happened. Use made-up code and names, never the source of a real product, and never a real key, token or password, even a revoked one.

## Scope

In scope:

- an input that makes the tool read a file other than the files and the configuration it was given, follow a symbolic link, or read a file a pattern of the configuration leaves out
- an input that makes the tool open a network connection, fetch a web address or an external entity, run a program or a build, load a module or evaluate any part of a file
- an input that makes the tool write a file
- an input that makes the tool hang, take very long or use unbounded memory, such as a very large file, very many files, long runs of quotes, backslashes or comment openers, templates nested very deep, XML nested very deep or very wide, or an entity that would expand to billions of characters
- binary, UTF-16 or invalid UTF-8 input that the tool reads as if it were text
- an input that the tool fails to read and passes over without an error, such as a string or a comment that is not closed, an XML tag that does not match, or an unknown key or a key named twice in the configuration
- a run that passes although a file it read holds a javax name, an artifact or a namespace that docs/method.md says is reported
- a javax package of the JDK that the tool reports as moved
- text from a file or a file name that rewrites the terminal through control or direction characters, starts or ends a GitHub workflow command, or is shown unescaped in the output
- a name such as `__proto__` that changes how objects behave inside the tool

Out of scope: the forms docs/limits.md says the tool does not read, whether the project builds or runs after the move, the libraries a project depends on and their versions, javax names that are not in the mapping, who may change the files or the configuration in your repository, and where your pipeline keeps the output.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
