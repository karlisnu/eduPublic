const { appendFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const backendDirectory = path.join(__dirname, "..");
const minimumTests = 20;
const commandArguments = [
  "--test",
  "--test-reporter=tap",
  "--experimental-test-coverage",
  "--test-coverage-include=src/**/*.js",
  "--test-coverage-lines=85",
  "--test-coverage-branches=70",
  "--test-coverage-functions=70",
];

const result = spawnSync(process.execPath, commandArguments, {
  cwd: backendDirectory,
  encoding: "utf8",
});

if (result.error) {
  throw result.error;
}

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");

if (result.status !== 0) {
  process.exitCode = result.status || 1;
} else {
  const counts = Object.fromEntries(
    [...(result.stdout || "").matchAll(/^# (tests|pass|fail|skipped|todo) (\d+)$/gm)]
      .map(([, name, count]) => [name, Number(count)]),
  );
  const missingCounts = ["tests", "pass", "fail", "skipped", "todo"]
    .filter((name) => counts[name] === undefined);

  if (missingCounts.length > 0) {
    throw new Error(`TAP report is missing required counts: ${missingCounts.join(", ")}`);
  }
  if (counts.tests < minimumTests) {
    throw new Error(
      `Backend test count ${counts.tests} is below the required minimum of ${minimumTests}.`,
    );
  }
  if (counts.skipped > 0 || counts.todo > 0) {
    throw new Error(
      `Disabled checks are not allowed: ${counts.skipped} skipped and ${counts.todo} todo tests.`,
    );
  }

  const summary = [
    "### Backend test gate",
    "",
    `- Tests: ${counts.tests} (minimum ${minimumTests})`,
    `- Passed: ${counts.pass}; failed: ${counts.fail}`,
    `- Skipped: ${counts.skipped}; TODO: ${counts.todo}`,
    "- Coverage minimums: 85% lines, 70% branches, 70% functions",
    "",
  ].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}
