const fs = require('fs');  
const content = Buffer.from(process.argv[1], 'base64').toString('utf8');  
fs.writeFileSync(process.argv[2], content, 'utf8');  
console.log('Written', process.argv[2]); 
