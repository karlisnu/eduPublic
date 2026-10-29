const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const path = require("node:path");

const backendDirectory = path.join(__dirname, "..");
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitForProcessExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => child.once("exit", resolve));
}

async function verifyDatabaseBackedHealthEndpoint() {
  const port = await findAvailablePort();
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: backendDirectory,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let spawnError;
  child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  child.once("error", (error) => { spawnError = error; });

  try {
    const url = `http://127.0.0.1:${port}/api/health`;
    const deadline = Date.now() + 20000;
    let lastConnectionError;

    while (Date.now() < deadline) {
      if (spawnError) throw new Error(`Could not start backend: ${spawnError.message}`);
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Backend exited before becoming healthy.\n${output}`);
      }

      let response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      } catch (error) {
        lastConnectionError = error;
        await wait(250);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Health endpoint returned HTTP ${response.status}.\n${output}`);
      }

      let body;
      try {
        body = await response.json();
      } catch (error) {
        throw new Error(`Health endpoint did not return valid JSON: ${error.message}`);
      }
      if (body.message !== "Backend funcionando" || body.database !== "mysql") {
        throw new Error(`Unexpected health response: ${JSON.stringify(body)}`);
      }

      console.log("MySQL-backed backend health endpoint verified.");
      return;
    }

    throw new Error(
      `Backend did not become healthy within 20 seconds: ${lastConnectionError?.message || "no response"}.\n${output}`,
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([waitForProcessExit(child), wait(3000)]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await waitForProcessExit(child);
      }
    }
  }
}

verifyDatabaseBackedHealthEndpoint().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
