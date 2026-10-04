// The kind of a file, from its path: what the tool reads it as. The path is the one the report shows, with forward
// slashes. A file of no kind is not read: named on the command line, or matched by a pattern of the configuration, it
// stops the run, so a file is never passed over in silence.

import { DESCRIPTORS } from './defaults.js';
import { asciiLower, baseName } from './words.js';

// The kinds, in the order the report counts them.
export const KINDS = ['java', 'kotlin', 'maven', 'gradle', 'catalog', 'descriptor', 'service'];

// The kind of a path, or null.
export function fileKind(path) {
  const name = baseName(path);
  const lower = asciiLower(name);
  const parts = String(path).split('/');
  if (parts.length >= 3 && parts.at(-3) === 'META-INF' && parts.at(-2) === 'services' && name) return 'service';
  if (lower.endsWith('.java')) return 'java';
  if (lower.endsWith('.gradle') || lower.endsWith('.gradle.kts')) return 'gradle';
  if (lower.endsWith('.kt') || lower.endsWith('.kts')) return 'kotlin';
  if (lower.endsWith('.versions.toml')) return 'catalog';
  if (lower === 'pom.xml') return 'maven';
  if (DESCRIPTORS.includes(lower)) return 'descriptor';
  return null;
}
