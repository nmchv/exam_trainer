import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });

for (const item of ['index.html', '.nojekyll', 'public', 'src']) {
  await cp(path.join(root, item), path.join(output, item), { recursive: true, force: true });
}
console.log(`Static site built in ${path.relative(root, output)}.`);
