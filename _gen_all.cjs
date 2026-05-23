var fs = require('fs'); 
var path = require('path'); 
var base = 'C:\workspace\personal-finance-manager'; 
function w(n, c) { var p = path.join(base, n); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, c, 'utf8'); console.log('Written:', n); } 
ECHO is on.
