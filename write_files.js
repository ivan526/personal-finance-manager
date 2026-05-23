const fs = require('fs');
const path = require('path');
const base = 'C:\\\\workspace\\\\personal-finance-manager';

const files = JSON.parse(process.argv[2]);
for (const [name, b64] of files) {
  const dir = path.dirname(path.join(base, name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(base, name), Buffer.from(b64, 'base64'), 'utf8');
  console.log('Written:', name);
}