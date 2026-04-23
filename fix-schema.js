const fs = require('fs');
const file = 'src/server/db/schema.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\.op\("[a-zA-Z0-9_]+"\)/g, '');
fs.writeFileSync(file, content);
console.log('Fixed schema.ts operators completely');
