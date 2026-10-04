# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A migration takes weeks or months, and it is tempting to give the tool a sense of time: a deadline in the
configuration after which a warning becomes an error, an `ignore` entry that runs out on a date, a report that says
how long ago a file was last changed. Each of these would make the same files give a different result on a different
day, so a pipeline that passed yesterday could fail today with no change to the repository, and two people running the
check on the same commit could see two answers. The output could never be saved and compared.

The checks that matter here do not need a date. Whether a file imports a javax class that moved, whether a build
names a Java EE artifact, whether a descriptor is in an old namespace: all of these can be read from the files as they
are.

## Decision

1. The tool reads no clock, no time zone and no locale. The same files and configuration give the same output on
   every machine and on every day.
2. The configuration has no key that holds a date. A team that wants a deadline lowers a rule to `warning` while the
   migration runs and raises it again in a commit of its own, where the change can be reviewed.
3. No file of this repository holds a date or a number that reads like a year: not the licence, not the changelog,
   not the examples, not the documents, not the comments of the code. `npm run check` and a test fail on any number
   that reads like a year. Version numbers such as Jakarta EE 9, Spring Boot 3 or Node 22 are not years and are fine.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it
  does not move with the calendar.
- An `ignore` entry stays until someone removes it. The summary counts the ignored names, so they stay visible in every
  report.
- The README, the documents and the examples can be read at any time without being out of date about a date.
