const { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync, readFileSync, writeFileSync } = require('fs');
const { createGunzip } = require('zlib');
const { pipeline } = require('stream/promises');
const path = require('path');

const pkgs = [
  { tgz: 'tmp_pkgs/jsdom2.tgz', name: 'jsdom' },
  { tgz: 'tmp_pkgs/vitest2.tgz', name: 'vitest' },
  { tgz: 'tmp_pkgs/rtl-react2.tgz', name: '@testing-library/react' },
  { tgz: 'tmp_pkgs/rtl-dom2.tgz', name: '@testing-library/dom' },
  { tgz: 'tmp_pkgs/rtl-jest-dom2.tgz', name: '@testing-library/jest-dom' },
];

function manualTarExtract(tarFile, dest) {
  const buf = readFileSync(tarFile);
  let offset = 0;
  while (offset < buf.length - 512) {
    const header = buf.slice(offset, offset + 512);
    const name = header.slice(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (!name) break;
    const sizeStr = header.slice(124, 136).toString('utf8').replace(/\0.*$/, '');
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = header[156];
    offset += 512;
    if (typeFlag === 0 || typeFlag === 48) {
      const filePath = path.join(dest, name);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, buf.slice(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
}

(async () => {
  for (const pkg of pkgs) {
    const dir = path.join('node_modules', pkg.name);
    const tmpDir = dir + '_tmp';
    mkdirSync(tmpDir, { recursive: true });
    const tarFile = pkg.tgz + '.tar';
    await pipeline(createReadStream(pkg.tgz), createGunzip(), createWriteStream(tarFile));
    manualTarExtract(tarFile, tmpDir);
    const innerPkg = path.join(tmpDir, 'package');
    if (existsSync(innerPkg)) {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      renameSync(innerPkg, dir);
      rmSync(tmpDir, { recursive: true, force: true });
    } else {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      renameSync(tmpDir, dir);
    }
    try { unlinkSync(tarFile); } catch(e) {}
    console.log('Extracted', pkg.name);
  }
  console.log('All done!');
})();