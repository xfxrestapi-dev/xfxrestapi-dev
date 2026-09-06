import { DurableObject } from "cloudflare:workers";

const json=(d,s=200,h={})=>new Response(JSON.stringify(d,null,2),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...h}});
const enc=new TextEncoder();
function b64(b){return btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"")}
async function mac(secret,data){const k=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",k,enc.encode(data)))}
async function jwt(payload,secret){const h=b64(enc.encode(JSON.stringify({alg:"HS256",typ:"JWT"})));const p=b64(enc.encode(JSON.stringify({...payload,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+604800})));const x=h+"."+p;return x+"."+b64(await mac(secret,x))}
function ub64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function verify(t,secret){try{const [h,p,s]=t.split(".");if(!h||!p||!s)return null;const e=b64(await mac(secret,h+"."+p));if(e!==s)return null;const x=JSON.parse(new TextDecoder().decode(ub64(p)));return x.exp&&x.exp<Math.floor(Date.now()/1000)?null:x}catch{return null}}

const routes={
 "/api/v1/alight-motion/send":["ALIGHT_MOTION_SEND_URL","ALIGHT_MOTION_API_KEY"],
 "/api/v1/alight-motion/verif":["ALIGHT_MOTION_VERIFY_URL","ALIGHT_MOTION_API_KEY"],
 "/api/v1/photoenhancer2":["PHOTOENHANCER2_URL","PHOTOENHANCER2_API_KEY"],
 "/api/v1/nftoken-gen":["NFTOKEN_GEN_URL","NFTOKEN_GEN_API_KEY"]
};

async function proxy(req,env,urlKey,keyKey){
 const target=env[urlKey]; if(!target)return json({ok:false,error:"Provider integration is not configured",missing:urlKey},503);
 const h=new Headers(req.headers);h.delete("host");h.delete("content-length");
 if(env[keyKey])h.set("x-api-key",env[keyKey]);
 const c=new AbortController(),t=setTimeout(()=>c.abort(),Number(env.UPSTREAM_TIMEOUT_MS||30000));
 try{
  const r=await fetch(target,{method:req.method,headers:h,body:["GET","HEAD"].includes(req.method)?undefined:req.body,signal:c.signal});
  const rh=new Headers(r.headers);rh.delete("set-cookie");rh.set("x-api-proxy","premium-api-worker");
  return new Response(r.body,{status:r.status,headers:rh});
 }catch(e){return json({ok:false,error:e.name==="AbortError"?"Provider timeout":"Provider request failed"},e.name==="AbortError"?504:502)}
 finally{clearTimeout(t)}
}

export default {async fetch(request,env){
 const u=new URL(request.url);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Authorization,Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"}});
 if(u.pathname==="/ws"){
  if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return json({ok:false,error:"WebSocket upgrade required"},426);
  return env.REALTIME.get(env.REALTIME.idFromName("global")).fetch(request);
 }
 if(u.pathname==="/api/v1/health")return json({ok:true,service:"premium-api-worker",runtime:"Cloudflare Workers",time:new Date().toISOString(),integrations:Object.fromEntries(Object.keys(routes).map(x=>[x,Boolean(env[routes[x][0]])]))});
 if(u.pathname==="/api/v1/auth/login"&&request.method==="POST"){
  const b=await request.json().catch(()=>({}));
  if(String(b.email||"").toLowerCase()!==String(env.ADMIN_EMAIL||"").toLowerCase()||String(b.password||"")!==String(env.ADMIN_PASSWORD||""))return json({ok:false,error:"Invalid credentials"},401);
  if(!env.JWT_SECRET||env.JWT_SECRET.length<32)return json({ok:false,error:"JWT_SECRET must be >=32 chars"},500);
  return json({ok:true,token:await jwt({sub:"admin",email:env.ADMIN_EMAIL,role:"admin"},env.JWT_SECRET),user:{email:env.ADMIN_EMAIL,role:"admin"}});
 }
 if(routes[u.pathname]&&request.method==="POST"){
  const a=request.headers.get("authorization")||"";
  const user=a.startsWith("Bearer ")?await verify(a.slice(7),env.JWT_SECRET||""):null;
  if(!user)return json({ok:false,error:"Bearer JWT required"},401);
  return proxy(request,env,...routes[u.pathname]);
 }
 if(env.ASSETS)return env.ASSETS.fetch(request);
 return json({ok:true,service:"premium-api-worker",endpoints:Object.keys(routes)});
}};

export class RealtimeRoom extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.sessions=new Map()}
 async fetch(request){
  const pair=new WebSocketPair();const [client,server]=Object.values(pair);server.accept();
  const id=crypto.randomUUID();this.sessions.set(server,{id});
  server.addEventListener("message",e=>{const m=JSON.stringify({type:"realtime.message",id,time:new Date().toISOString(),data:String(e.data)});for(const ws of this.sessions.keys())try{ws.send(m)}catch{}});
  server.addEventListener("close",()=>this.sessions.delete(server));
  server.send(JSON.stringify({type:"connected",id,clients:this.sessions.size,time:new Date().toISOString()}));
  return new Response(null,{status:101,webSocket:client});
 }
}
