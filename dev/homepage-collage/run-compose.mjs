import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./compose_column_strips.py', import.meta.url));
const manifestWriter = fileURLToPath(new URL('./compose-column-strips.ts', import.meta.url));
const commands =
  process.platform === 'win32'
    ? [
        ['py', ['-3', script]],
        ['python', [script]],
        ['python3', [script]],
      ]
    : [
        ['python3', [script]],
        ['python', [script]],
      ];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error && result.error.code === 'ENOENT') {
    continue;
  }
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }

  const writeManifest = spawnSync('npx', ['tsx', manifestWriter, '--write-manifest'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (writeManifest.error && writeManifest.error.code === 'ENOENT') {
    console.error('npx tsx is required to emit sources-manifest.json after collage compose.');
    process.exit(1);
  }
  process.exit(writeManifest.status ?? 1);
}

console.error('Python 3.9+ is required for collage:compose. Install Python and retry.');
process.exit(1);
