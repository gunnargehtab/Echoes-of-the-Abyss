import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.CLAUDE_CODE_REMOTE === 'true') {
  const script = fileURLToPath(new URL('./session-start.sh', import.meta.url));
  const result = spawnSync('bash', [script], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`session-start terminated by ${result.signal}`);
  process.exitCode = result.status;
}
