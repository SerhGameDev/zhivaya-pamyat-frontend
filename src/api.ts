export type Hotspot={id:string;title:string;x:number;y:number;text:string;photos?:string[]};
export type View={id:string;label:string;image:string;hotspots:Hotspot[]};
export type Monument={id:string;title:string;location:string;status:string;description:string;image:string;hotspots:Hotspot[];scale?:number;pointSize?:number;showLabels?:boolean;views?:View[]};
export type Firefighter={id:string;name:string;years:string;bio:string;monumentId:string};
export type Content={schemaVersion:number;revision:number;intro:string;monuments:Monument[];firefighters:Firefighter[]};
const base=import.meta.env?.VITE_API_BASE_URL||'';
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{const r=await fetch(base+path,options);const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось выполнить запрос');return d;}
export const loadContent=()=>request<Content>('/api/content');
export const saveContent=(data:Content)=>request<Content>('/api/content',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionStorage.getItem('admin-token')||''}`},body:JSON.stringify(data)});
