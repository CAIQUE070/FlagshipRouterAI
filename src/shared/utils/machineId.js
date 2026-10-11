import { machineIdSync } from 'node-machine-id';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { DATA_DIR } from '@/lib/dataDir';

const MACHINE_ID_FILE = path.join(DATA_DIR, 'machine-id');
const AUTH_DIR = path.join(DATA_DIR, 'auth');
const CLI_SECRET_FILE = path.join(AUTH_DIR, 'cli-secret');
const CLI_AUTH_SALT = 'fr-cli-auth';
let cachedRawId = null;
let cachedCliSecret = null;

function getSystemMachineId() {
  if (process.platform !== 'linux') return machineIdSync();

  for (const file of ['/var/lib/dbus/machine-id', '/etc/machine-id']) {
    try {
      const id = fs.readFileSync(file, 'utf8').trim();
      if (id) return crypto.createHash('sha256').update(id.toLowerCase()).digest('hex');
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EACCES') throw error;
    }
  }

  const hostname = os.hostname().trim().toLowerCase();
  return hostname ? crypto.createHash('sha256').update(hostname).digest('hex') : crypto.randomUUID();
}

// Persist the machine ID so CLI/server/middleware use the same value across runtimes.
function loadRawMachineId() {
  if (cachedRawId) return cachedRawId;
  try {
    cachedRawId = fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim();
    if (cachedRawId) return cachedRawId;
  } catch {}
  try {
    cachedRawId = getSystemMachineId();
  } catch {
    cachedRawId = crypto.randomUUID();
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(MACHINE_ID_FILE, cachedRawId, { mode: 0o600 });
  } catch {}
  return cachedRawId;
}

// Random secret persisted on first run → unpredictable CLI token even when machineId leaks.
function loadCliSecret() {
  if (cachedCliSecret) return cachedCliSecret;
  try {
    cachedCliSecret = fs.readFileSync(CLI_SECRET_FILE, 'utf8').trim();
    if (cachedCliSecret) return cachedCliSecret;
  } catch {}
  cachedCliSecret = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(CLI_SECRET_FILE, cachedCliSecret, { mode: 0o600 });
  } catch {}
  return cachedCliSecret;
}

export async function getConsistentMachineId(salt = null) {
  const saltValue = salt || process.env.MACHINE_ID_SALT || 'endpoint-proxy-salt';
  const raw = loadRawMachineId();
  const extra = saltValue === CLI_AUTH_SALT ? loadCliSecret() : '';
  return crypto.createHash('sha256').update(raw + saltValue + extra).digest('hex').substring(0, 16);
}

export async function getRawMachineId() {
  return loadRawMachineId();
}

/**
 * Check if we're running in browser or server environment
 * @returns {boolean} True if in browser, false if in server
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}
