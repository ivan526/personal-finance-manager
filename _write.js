var fs = require('fs');  
var b64 = fs.readFileSync('_test_b64.txt', 'utf8').trim();  
fs.writeFileSync('src/utils/storage.test.ts', Buffer.from(b64, 'base64').toString('utf8'), 'utf8');  
console.log('done'); 
