const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkgs = [
  { tgz: 'tmp_pkgs/jsdom.tgz', name: 'jsdom' },
  { tgz: 'tmp_pkgs/vitest.tgz', name: 'vitest' },
  { tgz: 'tmp_pkgs/testing-library-react.tgz', name: '@testing-library/react' },
  { tgz: 'tmp_pkgs/testing-library-dom.tgz', name: '@testing-library/dom' },
  { tgz: 'tmp_pkgs/testing-library-jest-dom.tgz', name: '@testing-library/jest-dom' },
];

for (const pkg of pkgs) {
  const dir = path.join('node_modules', pkg.name);
  const tmpDir = dir + '_tmp';
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    execSync(`7z x "${pkg.tgz}" -o"${tmpDir}" -y`, { stdio: 'pipe' });
  } catch (e) {
    console.log('7z not found, trying alternative...');
    // Try using node's zlib to gunzip, then untar
    try {
      const { createReadStream, createWriteStream } = require('fs');
      const { createGunzip } = require('zlib');
      const { pipeline } = require('stream/promises');
      const tarFile = pkg.tgz + '.tar';
      await pipelineAsync(createReadStream(pkg.tgz), createGunzip(), createWriteStream(tarFile));
      execSync(`tar xf "${tarFile}" -C "${tmpDir}"`, { stdio: 'pipe' });
      fs.unlinkSync(tarFile);
    } catch (e2) {
      console.log('Failed to extract', pkg.name, e2.message);
      continue;
    }
  }

  const entries = fs.readdirSync(tmpDir);
  if (entries.includes('package')) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    fs.renameSync(path.join(tmpDir, 'package'), dir);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } else {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    fs.renameSync(tmpDir, dir);
  }
  console.log('Extracted', pkg.name);
}

function pipelineAsync(...args) {
  return new Promise((resolve, reject) => {
    const { pipeline } = require('stream');
    pipeline(...args, (err) => err ? reject(err) : resolve());
  });
}

console.log('All done!');
