var fs = require('fs');
var dir = __dirname + '/writings';
var out = dir + '/list.json';
var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.pdf'); });
fs.writeFileSync(out, JSON.stringify(files, null, 2));
console.log('writings/list.json updated with ' + files.length + ' PDF(s)');
