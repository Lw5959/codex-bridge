import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOG_DIR = process.env.LOG_DIR || '';
const logToFile = LOG_DIR.length > 0;

if (logToFile) {
  mkdirSync(LOG_DIR, { recursive: true });
}

function dateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function ts(): string {
  return new Date().toISOString();
}

function writeToFile(level: string, msg: string) {
  if (!logToFile) return;
  const file = join(LOG_DIR, `${dateStr()}.log`);
  const line = `[${ts()}] [${level}] ${msg}\n`;
  try {
    appendFileSync(file, line);
  } catch { /* ignore write errors */ }
}

export const logger = {
  info(...args: any[]) {
    const msg = args.map(String).join(' ');
    console.log(msg);
    writeToFile('INFO', msg);
  },

  error(...args: any[]) {
    const msg = args.map(String).join(' ');
    console.error(msg);
    writeToFile('ERROR', msg);
  },
};
