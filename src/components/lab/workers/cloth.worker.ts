import {createCloth,cutCloth,stepCloth,type ClothOptions} from '../algorithms/cloth';
let cloth=createCloth();
self.onmessage=(event:MessageEvent<{type:'step';options:ClothOptions;steps:number}|{type:'reset'}|{type:'cut';x:number;y:number}|{type:'pin';id:number}>)=>{
  const msg=event.data;
  if(msg.type==='reset') cloth=createCloth();
  if(msg.type==='cut') cutCloth(cloth,msg.x,msg.y);
  if(msg.type==='pin'&&cloth.points[msg.id]) {const p=cloth.points[msg.id];p.pinned=!p.pinned;p.px=p.x;p.py=p.y;}
  if(msg.type==='step') stepCloth(cloth,msg.options,msg.steps);
  self.postMessage(cloth);
};
