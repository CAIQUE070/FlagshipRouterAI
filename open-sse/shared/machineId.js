import { machineIdSync } from "node-machine-id";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";

let cachedRawId = null;

function getSystemMachineId() {
  if (process.platform !== "linux") return machineIdSync();

  for (const file of ["/var/lib/dbus/machine-id", "/etc/machine-id"]) {
    try {
      const id = fs.readFileSync(file, "utf8").trim();
      if (id) return crypto.createHash("sha256").update(id.toLowerCase()).digest("hex");
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "EACCES") throw error;
    }
  }

  const hostname = os.hostname().trim().toLowerCase();
  return hostname ? crypto.createHash("sha256").update(hostname).digest("hex") : crypto.randomUUID();
}

function loadRawMachineId() {
  if (cachedRawId) return cachedRawId;
  try {
    cachedRawId = getSystemMachineId();
  } catch {
    cachedRawId = crypto.randomUUID();
  }
  return cachedRawId;
}

export async function getConsistentMachineId(salt = "endpoint-proxy-salt") {
  const rawId = loadRawMachineId();
  return crypto.createHash("sha256").update(rawId + salt).digest("hex").substring(0, 16);
}
