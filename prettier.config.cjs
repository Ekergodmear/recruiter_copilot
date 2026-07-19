/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  // TECH-007 — match .gitattributes eol=lf so format:check is OS-independent.
  endOfLine: "lf",
};
