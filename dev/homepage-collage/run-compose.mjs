import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./compose_column_strips.py', import.meta.url));
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
  process.exit(result.status ?? 1);
}

console.error('Python 3.9+ is required for collage:compose. Install Python and retry.');
process.exit(1);
