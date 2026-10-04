// Words compared as the tool compares them: the letters A to Z lowered whatever the locale. Used for the suggestions of
// the configuration and for the names of descriptor files.

// Lowercase for the letters A to Z only, so the result does not depend on the locale.
export const asciiLower = (text) => String(text).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

// The last part of a path with forward slashes: "a/b/web.xml" is "web.xml".
export const baseName = (path) => String(path).slice(String(path).lastIndexOf('/') + 1);
