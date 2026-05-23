var fs = require('fs');  
var content = Buffer.from(fs.readFileSync('_test_b64.txt', 'utf8').trim(), 'base64').toString('utf8');  
fs.writeFileSync('src/utils/storage.test.ts', content, 'utf8');  
console.log('done', content.length); 
