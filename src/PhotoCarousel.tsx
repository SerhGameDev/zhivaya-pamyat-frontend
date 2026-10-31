import {useRef,useState} from 'react';
export function PhotoCarousel({photos,title}:{photos:string[];title:string}){
 const [index,setIndex]=useState(0);const start=useRef<number|null>(null);const i=Math.min(index,photos.length-1);
 if(!photos.length)return null;
 const move=(step:number)=>setIndex((i+step+photos.length)%photos.length);
 return <div className="photo-carousel" onTouchStart={e=>{start.current=e.touches[0].clientX}} onTouchEnd={e=>{if(start.current!==null){const dx=e.changedTouches[0].clientX-start.current;if(Math.abs(dx)>40)move(dx<0?1:-1)}start.current=null}}><img key={photos[i]} src={photos[i]} alt={`${title}, фото ${i+1}`} draggable={false}/>{photos.length>1&&<div className="photo-controls"><button aria-label="Предыдущее фото" onClick={()=>move(-1)}>←</button><span aria-live="polite">{i+1} / {photos.length}</span><button aria-label="Следующее фото" onClick={()=>move(1)}>→</button></div>}</div>
}
