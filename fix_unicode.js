const fs = require('fs');
const filePath = 'src/pages/Investment.tsx';
let buf = fs.readFileSync(filePath);

// 将 \x5c + 3字节UTF-8中文字符 替换为 正常的3字节UTF-8中文字符
// 中文字符 UTF-8 范围: \xe4-\xef 开头 + 2个续字节(\x80-\xbf)
let result = [];
let i = 0;
while (i < buf.length) {
  // 检查是否是反斜杠后跟3字节UTF-8中文
  if (buf[i] === 0x5c && i + 3 < buf.length &&
      buf[i+1] >= 0xe4 && buf[i+1] <= 0xef &&
      buf[i+2] >= 0x80 && buf[i+2] <= 0xbf &&
      buf[i+3] >= 0x80 && buf[i+3] <= 0xbf) {
    // 去掉反斜杠，保留3字节UTF-8
    result.push(buf[i+1], buf[i+2], buf[i+3]);
    i += 4;
  } else {
    result.push(buf[i]);
    i++;
  }
}

const fixed = Buffer.from(result);
const changed = !buf.equals(fixed);
console.log('有变化:', changed);
console.log('原始大小:', buf.length, '修复后:', fixed.length);

fs.writeFileSync(filePath, fixed, 'utf-8');
console.log('完成');
