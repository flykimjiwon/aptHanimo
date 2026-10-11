import { readdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const files=await readdir('dist',{recursive:true});
let count=0;
for(const file of files.filter(file=>/\.(js|css|json|html|svg)$/.test(file))){const bytes=await readFile(`dist/${file}`);await writeFile(`dist/${file}.gz`,gzipSync(bytes,{level:9}));count++;}
console.log(`Precompressed ${count} static assets.`);
