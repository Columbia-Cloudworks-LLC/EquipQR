import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
async function runProcess(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', reject);
    child.on('close', (code) =>
      resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr })
    );
  });
}

/**
 * @param {string} command
 */
async function binaryAvailable(command) {
  try {
    const result =
      process.platform === 'win32'
        ? await runProcess('where', [command], process.cwd())
        : await runProcess('command', ['-v', command], process.cwd());
    return result.code === 0;
  } catch {
    return false;
  }
}

/**
 * @param {{
 *  repoRoot: string,
 *  sceneClipRelativePaths: string[],
 *  outputRelativePath: string,
 *  introText?: string,
 *  outroText?: string
 * }} opts
 */
export async function composeSceneClips(opts) {
  const hasFfmpeg = await binaryAvailable('ffmpeg');
  if (!hasFfmpeg) {
    return {
      composed: false,
      skippedReason: 'ffmpeg-unavailable'
    };
  }

  if (!opts.sceneClipRelativePaths.length) {
    return {
      composed: false,
      skippedReason: 'no-scene-clips'
    };
  }

  const listPath = path.resolve(opts.repoRoot, 'tmp', 'demos', 'compose-input.txt');
  const absoluteOutput = path.resolve(opts.repoRoot, opts.outputRelativePath);
  const lines = opts.sceneClipRelativePaths
    .map((clip) => path.resolve(opts.repoRoot, clip).replace(/\\/g, '/'))
    .map((absolute) => `file '${absolute}'`)
    .join('\n');
  await fs.writeFile(listPath, `${lines}\n`, 'utf8');

  const introText = opts.introText || 'EquipQR Demo';
  const outroText = opts.outroText || 'End of Demo';
  const introFilter = `drawtext=text='${introText.replace(/'/g, "\\'")}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=36:fontcolor=white`;
  const outroFilter = `drawtext=text='${outroText.replace(/'/g, "\\'")}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=36:fontcolor=white`;

  const introPath = path.resolve(opts.repoRoot, 'tmp', 'demos', 'compose-intro.mp4');
  const outroPath = path.resolve(opts.repoRoot, 'tmp', 'demos', 'compose-outro.mp4');
  const introResult = await runProcess(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=1366x900:d=1.5', '-vf', introFilter, introPath],
    opts.repoRoot
  );
  if (introResult.code !== 0) {
    return { composed: false, skippedReason: 'intro-render-failed' };
  }

  const outroResult = await runProcess(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=1366x900:d=1.5', '-vf', outroFilter, outroPath],
    opts.repoRoot
  );
  if (outroResult.code !== 0) {
    return { composed: false, skippedReason: 'outro-render-failed' };
  }

  const mergedListPath = path.resolve(opts.repoRoot, 'tmp', 'demos', 'compose-merged-input.txt');
  const mergedLines = [
    `file '${introPath.replace(/\\/g, '/')}'`,
    ...opts.sceneClipRelativePaths.map((clip) => `file '${path.resolve(opts.repoRoot, clip).replace(/\\/g, '/')}'`),
    `file '${outroPath.replace(/\\/g, '/')}'`
  ].join('\n');
  await fs.writeFile(mergedListPath, `${mergedLines}\n`, 'utf8');

  const concatResult = await runProcess(
    'ffmpeg',
    ['-y', '-f', 'concat', '-safe', '0', '-i', mergedListPath, '-c', 'copy', absoluteOutput],
    opts.repoRoot
  );

  if (concatResult.code !== 0) {
    return { composed: false, skippedReason: 'concat-failed' };
  }

  return {
    composed: true,
    skippedReason: null,
    outputRelativePath: opts.outputRelativePath
  };
}

/**
 * @param {{ enabledFromFlag: boolean, composeFlag: boolean | null }} opts
 */
export function resolveComposeEnabled(opts) {
  if (opts.composeFlag === true) return true;
  if (opts.composeFlag === false) return false;
  return opts.enabledFromFlag;
}
