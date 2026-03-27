import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export interface BabylonConfig {
  apiUrl: string;
  pin?: string;
}

const CONFIG_DIR = join(homedir(), '.babylon');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULTS: BabylonConfig = {
  apiUrl: 'https://api.internalrr.info/api',
};

export async function readConfig(): Promise<BabylonConfig> {
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) } as BabylonConfig;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeConfig(patch: Partial<BabylonConfig>): Promise<void> {
  const current = await readConfig();
  const next = { ...current, ...patch };
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8');
}
