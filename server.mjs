import http from 'node:http';
import {readFile,writeFile,rename,copyFile,mkdir} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(root,'data/content.json');
const password=process.env.ADMIN_PASSWORD||randomBytes(12).toString('hex');
const token=randomBytes(32).toString('hex');
const production=process.argv.includes('--production');
const vite=production?null:await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'});
let writing=false;
function validLegacy(d){
 const str=(s,n=30000)=>typeof s==='string'&&s.length<=n;
 const ids=a=>new Set(a.map(v=>v.id)).size===a.length;
 const image=s=>str(s,2000)&&(/^\/(?!\/)/.test(s)||/^https:\/\//.test(s));
 return d&&d.schemaVersion===1&&Number.isInteger(d.revision)&&str(d.intro)&&Array.isArray(d.monuments)&&d.monuments.length>0&&d.monuments.length<=100&&ids(d.monuments)&&d.monuments.every(m=>str(m.id,100)&&/^[a-z0-9-]+$/.test(m.id)&&str(m.title,200)&&str(m.status,200)&&str(m.location,500)&&str(m.description)&&image(m.image)&&Array.isArray(m.hotspots)&&m.hotspots.length<=100&&ids(m.hotspots)&&m.hotspots.every(h=>str(h.id,100)&&str(h.title,200)&&str(h.text)&&Number.isFinite(h.x)&&h.x>=0&&h.x<=100&&Number.isFinite(h.y)&&h.y>=0&&h.y<=100))&&Array.isArray(d.firefighters)&&d.firefighters.length<=1000&&ids(d.firefighters)&&d.firefighters.every(p=>str(p.id,100)&&str(p.name,200)&&str(p.years,100)&&str(p.bio)&&str(p.monumentId,100)&&d.monuments.some(m=>m.id===p.monumentId));
}
function valid(d){
 if(!validLegacy(d))return false;
 return d.monuments.every(m=>m.views===undefined||(Array.isArray(m.views)&&m.views.length>0&&m.views.length<=20&&new Set(m.views.map(v=>v?.id)).size===m.views.length&&m.views.every(v=>v&&typeof v.label==='string'&&v.label.length<=200&&validLegacy({...d,monuments:[{...m,id:v.id,image:v.image,hotspots:v.hotspots}],firefighters:[]}))));
}
async function body(req){let s='';for await(const b of req){s+=b;if(Buffer.byteLength(s)>12e6)throw Error('Слишком большой файл');}return JSON.parse(s);}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 try{
  if(url.pathname==='/api/images'&&req.method==='POST'){
   
   const d=await body(req);if(typeof d.data!=='string')return send(400,{error:'Изображение отсутствует'});
   const bytes=Buffer.from(d.data,'base64');if(bytes.length>8*1024*1024)return send(400,{error:'Максимальный размер — 8 МБ'});
   const ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
   if(!ext)return send(400,{error:'Поддерживаются PNG, JPEG и WebP'});
   const name=randomBytes(16).toString('hex')+'.'+ext;await mkdir(path.join(root,'public/uploads'),{recursive:true});await writeFile(path.join(root,'public/uploads',name),bytes);return send(201,{url:'/uploads/'+name});
  }
  if(url.pathname.startsWith('/uploads/')&&req.method==='GET'){
   const name=url.pathname.slice(9);if(!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(name))return send(404,{error:'Нет изображения'});
   try{const image=await readFile(path.join(root,'public/uploads',name));res.setHeader('Content-Type',name.endsWith('.png')?'image/png':name.endsWith('.webp')?'image/webp':'image/jpeg');res.setHeader('X-Content-Type-Options','nosniff');return res.end(image);}catch{return send(404,{error:'Нет изображения'});}
  }
  if(url.pathname==='/api/content'&&req.method==='GET')return send(200,JSON.parse(await readFile(file,'utf8')));
  if(url.pathname==='/api/login'&&req.method==='POST'){
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return send(403,{error:'Недопустимый источник'});
   const d=await body(req);const a=Buffer.from(String(d.password));const b=Buffer.from(password);
   return a.length===b.length&&timingSafeEqual(a,b)?send(200,{token}):send(401,{error:'Неверный пароль'});
  }
  if(url.pathname==='/api/content'&&req.method==='PUT'){
   
   const d=await body(req);if(!valid(d))return send(400,{error:'Неверная структура JSON или значения полей'});
   if(writing)return send(409,{error:'Сохранение уже выполняется'});
   writing=true;
   try{const old=JSON.parse(await readFile(file,'utf8'));if(d.revision!==old.revision)return send(409,{error:'Данные изменились. Обновите страницу перед редактированием.'});d.revision++;await copyFile(file,file+'.bak');await writeFile(file+'.tmp',JSON.stringify(d,null,2));await rename(file+'.tmp',file);return send(200,d);}finally{writing=false;}
  }
  if(url.pathname.startsWith('/api/'))return send(404,{error:'Маршрут не найден'});
  if(vite)return vite.middlewares(req,res);
  const requested=decodeURIComponent(url.pathname);const target=path.resolve(root,'dist','.'+requested);
  if(!target.startsWith(path.join(root,'dist')+path.sep)&&target!==path.join(root,'dist'))return send(403,{error:'Forbidden'});
  let data,ext;try{data=await readFile(target);ext=path.extname(target);}catch{data=await readFile(path.join(root,'dist/index.html'));ext='.html';}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'})[ext]||'application/octet-stream');res.end(data);
 }catch(e){send(400,{error:e.message||'Ошибка запроса'});}
});
server.listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>{console.log('\nЖивая память: http://localhost:5173\nАдмин-панель: http://localhost:5173/#admin\nПароль администратора: '+password);for(const list of Object.values(networkInterfaces()))for(const a of list||[])if(a.family==='IPv4'&&!a.internal)console.log('Смартфон (общая Wi-Fi сеть): http://'+a.address+':5173');});
