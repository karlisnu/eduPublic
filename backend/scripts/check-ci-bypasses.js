const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.join(__dirname, "../..");
const scanTargets = [
  ".github/workflows",
  "backend/src",
  "backend/test",
];
const prohibitedPatterns = [
  {
    name: "skipped, focused, or TODO tests",
    pattern: /\b(?:describe|it|test|suite|spec)\s*\.\s*(?:skip|only|todo)\s*\(/,
  },
  {
    name: "x-prefixed disabled tests",
    pattern: /\b(?:xit|xdescribe|xtest)\s*\(/,
  },
  {
    name: "workflow steps that continue after failure",
    pattern: /\bcontinue-on-error\s*:\s*true\b/i,
  },
  {
    name: "shell commands that hide failures",
    pattern: /(?:^|\s)\|\|\s*true(?:\s|$)/m,
  },
  {
    name: "coverage suppression directives",
    pattern: /\b(?:istanbul|c8|v8)\s+ignore\b/i,
  },
];

function listFiles(targetPath) {
  return readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}

const violations = [];
for (const relativeTarget of scanTargets) {
  const targetPath = path.join(repositoryRoot, relativeTarget);
  for (const filePath of listFiles(targetPath)) {
    const content = readFileSync(filePath, "utf8");
    for (const rule of prohibitedPatterns) {
      const match = rule.pattern.exec(content);
      if (match) {
        const line = content.slice(0, match.index).split("\n").length;
        violations.push(`${path.relative(repositoryRoot, filePath)}:${line}: ${rule.name}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`CI check bypasses detected:\n${violations.map((item) => `- ${item}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("No disabled tests, suppressed coverage, or ignored CI failures detected.");
}
