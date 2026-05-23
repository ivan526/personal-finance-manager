const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const wrapperVersion = '5.0.0';
const hvigorDir = path.join(__dirname, '.hvigor');
const hvigorVersionFile = path.join(hvigorDir, 'hvigor-version');

function getInstalledVersion() {
  if (fs.existsSync(hvigorVersionFile)) {
    return fs.readFileSync(hvigorVersionFile, 'utf8').trim();
  }
  return null;
}

function installHvigor() {
  console.log(`Installing hvigor ${wrapperVersion}...`);
  execSync('npm install @ohos/hvigor@' + wrapperVersion, { stdio: 'inherit' });
  if (!fs.existsSync(hvigorDir)) {
    fs.mkdirSync(hvigorDir, { recursive: true });
  }
  fs.writeFileSync(hvigorVersionFile, wrapperVersion);
}

const installedVersion = getInstalledVersion();
if (!installedVersion || installedVersion !== wrapperVersion) {
  installHvigor();
}

require('./node_modules/@ohos/hvigor/bin/hvigor');
