import { createReadStream, mkdirSync, existsSync, readdirSync, renameSync, rmSync, cpSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';

const base = 'C:\\workspace\\personal-finance-manager';
const pkgs = [
  { tgz: 'tmp_pkgs/jsdom.tgz', dir: 'node_modules/jsdom' },
  { tgz: 'tmp_pkgs/vitest.tgz', dir: 'node_modules/vitest' },
  { tgz: 'tmp_pkgs/testing-library-react.tgz', dir: 'node_modules/@testing-library/react' },
  { tgz: 'tmp_pkgs/testing-library-dom.tgz', dir: 'node_modules/@testing-library/dom' },
  { tgz: 'tmp_pkgs/testing-library-jest-dom.tgz', dir: 'node_modules/@testing-library/jest-dom' },
];

async function extract({ tgz, dir }) {
  const outDir = join(base, dir);
  const tmpDir = outDir + '_tmp';
  mkdirSync(tmpDir, { recursive: true });
  
  // Use npm's bundled tar or npx tar
  try {
    execSync(`npx tar xzf "${join(base, tgz)}" -C "${tmpDir}" --strip-components=1`, { stdio: 'pipe' });
  } catch {
    // fallback: use node to decompress gunzip then extract tar
    const { Gunzip } = await import('module').catch(() => ({}));
    // Last resort: use powershell
    const cmd = `powershell -Command "$gz = [System.IO.File]::ReadAllBytes('${join(base, tgz).replace(/'/g, "''")}'); $ms = New-Object System.IO.MemoryStream($gz); $gzStream = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Decompress); $out = New-Object System.IO.MemoryStream; $gzStream.CopyTo($out); [System.IO.File]::WriteAllBytes('${(join(base, tgz)+'.tar').replace(/'/g, "''")}', $out.ToArray())"`;
    execSync(cmd, { stdio: 'pipe' });
    execSync(`tar xzf "${join(base, tgz)}.tar" -C "${tmpDir}" --strip-components=1`, { stdio: 'pipe' });
  }
  
  // Move contents from package/ if exists
  const inner = join(tmpDir, 'package');
  if (existsSync(inner)) {
    if (existsSync(outDir)) rmSync(outDir, { recursive: true });
    renameSync(inner, outDir);
  } else {
    if (existsSync(outDir)) rmSync(outDir, { recursive: true });
    renameSync(tmpDir, outDir);
  }
  rmSync(tmpDir, { recursive: true, force: true });
  console.log('Extracted', dir);
}

(async () => {
  for (const pkg of pkgs) {
    await extract(pkg);
  }
  console.log('All done!');
})();
