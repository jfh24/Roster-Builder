const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const pidFile = path.join(root, ".server.pid");
const isWindows = process.platform === "win32";

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const pids = new Set();
  const pidFromFile = readPidFile();

  if (pidFromFile) {
    pids.add(pidFromFile);
  }

  for (const pid of await findPidsByPort(port)) {
    pids.add(pid);
  }

  pids.delete(process.pid);

  if (!pids.size) {
    cleanupPidFile();
    console.log(`No roster server found on port ${port}.`);
    return;
  }

  for (const pid of pids) {
    await stopProcess(pid);
  }

  cleanupPidFile();
  console.log(`Stopped roster server on port ${port}.`);
}

function readPidFile() {
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function cleanupPidFile() {
  try {
    fs.rmSync(pidFile, { force: true });
  } catch {
    // Nothing useful to do here; the server is already stopped.
  }
}

async function findPidsByPort(targetPort) {
  return isWindows ? findWindowsPidsByPort(targetPort) : findUnixPidsByPort(targetPort);
}

function findWindowsPidsByPort(targetPort) {
  return new Promise((resolve) => {
    execFile("netstat", ["-ano", "-p", "tcp"], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const pids = stdout
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/))
        .filter((columns) => columns.length >= 5 && columns[0] === "TCP" && columns[3] === "LISTENING")
        .filter((columns) => addressUsesPort(columns[1], targetPort))
        .map((columns) => Number(columns[4]))
        .filter((pid) => Number.isInteger(pid) && pid > 0);

      resolve([...new Set(pids)]);
    });
  });
}

function findUnixPidsByPort(targetPort) {
  return new Promise((resolve) => {
    execFile("lsof", ["-ti", `tcp:${targetPort}`, "-sTCP:LISTEN"], (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const pids = stdout
        .split(/\s+/)
        .map((value) => Number(value))
        .filter((pid) => Number.isInteger(pid) && pid > 0);

      resolve([...new Set(pids)]);
    });
  });
}

function addressUsesPort(address, targetPort) {
  return address.endsWith(`:${targetPort}`);
}

async function stopProcess(pid) {
  if (!isProcessRunning(pid)) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") {
      throw error;
    }
  }

  await waitForExit(pid, 2200);

  if (!isProcessRunning(pid)) {
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") {
      throw error;
    }
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pid, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessRunning(pid)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
