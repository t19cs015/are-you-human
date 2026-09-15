import {copyFile,lstat,mkdir,readdir,readFile,rm} from 'node:fs/promises';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isPublicFile} from '../server/public-files.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildWeb(output=join(root,'dist')){
 const files=['index.html','character-review.html','cafe-review.html'];
 async function visit(directory){
  for(const entry of await readdir(join(root,directory),{withFileTypes:true})){
   const path=directory+'/'+entry.name;
   if(entry.isDirectory())await visit(path);
   else if(entry.isFile()&&isPublicFile('/'+path))files.push(path);
  }
 }
 for(const directory of ['src','assets','node_modules/three'])await visit(directory);
 // Build an explicit public directory; Vercel must never serve the repository root.
 await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
 let total=0;
 for(const file of files){
  const source=join(root,file);
  if(!(await lstat(source)).isFile()||!isPublicFile('/'+file))throw new Error('UNSAFE_PUBLIC_FILE: '+file);
  const bytes=await readFile(source);
  if(/sk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{24,}/.test(bytes.toString('utf8')))throw new Error('SECRET_IN_PUBLIC_FILE: '+file);
  const target=join(output,file);await mkdir(dirname(target),{recursive:true});await copyFile(source,target);total+=bytes.length;
 }
 return {files:files.length,bytes:total,output:relative(root,output)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await buildWeb();console.log(`Public build: ${result.files} files, ${(result.bytes/1048576).toFixed(1)} MB → ${result.output}`);
}
