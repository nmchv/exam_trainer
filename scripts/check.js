import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist']);
const syntaxFiles = [];
const jsonFiles = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) await scan(path.join(directory, entry.name));
      continue;
    }
    const file = path.join(directory, entry.name);
    if (entry.name.endsWith('.js')) syntaxFiles.push(file);
    if (entry.name.endsWith('.json')) jsonFiles.push(file);
  }
}

await scan(root);
for (const file of jsonFiles) {
  try {
    JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Некорректный JSON: ${path.relative(root, file)} — ${error.message}`);
    process.exitCode = 1;
  }
}
for (const file of syntaxFiles) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) {
    console.error(check.stderr || check.stdout);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log(`Проверено файлов: ${syntaxFiles.length} JavaScript, ${jsonFiles.length} JSON.`);
