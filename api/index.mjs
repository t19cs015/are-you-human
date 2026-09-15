import {waitUntil} from '@vercel/functions';
import {createHandler} from '../server.mjs';
import {hostedOptions} from '../server/hosted-config.mjs';

let handler;
export default async function api(req,res){
 try{
  const url=new URL(req.url,'https://localhost');
  const route=url.searchParams.get('__route');
  if(route!==null){
   if(!/^[a-z-]+(?:\/[a-z-]+)*$/.test(route))throw new Error('INVALID_ROUTE');
   url.searchParams.delete('__route');req.url='/api/'+route+url.search;
  }
  handler??=createHandler({...hostedOptions(),background:waitUntil});
  return await handler(req,res);
 }catch{
  // Configuration and provider errors must not expose credentials or stack traces.
  res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify({error:'DEPLOYMENT_NOT_CONFIGURED'}));
 }
}
