import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {createSociety} from './society.mjs';
const valid=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
export function createStorage(directory){
 const queues=new Map();
 return {
  async load(id){
   if(!valid(id))return null;
   let data;try{data=JSON.parse(await readFile(join(directory,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw new Error('SAVE_READ_FAILED');}
   if(data.schema!==1||!data.world?.agents)throw new Error('SAVE_READ_FAILED');
   const world=createSociety();Object.assign(world,data.world,{busy:new Set()});
   for(const id of Object.keys(createSociety().agents))if(!world.agents[id])throw new Error('SAVE_READ_FAILED');
   return world;
  },
  save(id,world){
   if(!valid(id))return Promise.reject(new Error('SAVE_WRITE_FAILED'));
   // Serialize immediately; later requests cannot mutate this snapshot. Config is excluded.
   const {busy,...state}=world;const serialized=JSON.stringify({schema:1,world:state});
   const previous=queues.get(id)||Promise.resolve();
   const task=previous.catch(()=>{}).then(async()=>{
    try{await mkdir(directory,{recursive:true,mode:0o700});const file=join(directory,id+'.json');await writeFile(file+'.tmp',serialized,{mode:0o600});await rename(file+'.tmp',file);}catch{throw new Error('SAVE_WRITE_FAILED');}
   });queues.set(id,task);task.finally(()=>{if(queues.get(id)===task)queues.delete(id);}).catch(()=>{});return task;
  }
 };
}
