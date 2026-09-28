// Material construido para practicar. No pertenece al corpus ni a la reserva.
export const demoItems=[
 {id:'EJEMPLO-T01',partition:'desarrollo',kind:'texto',title:'Ejemplo de texto',ordinal:1,content_hash:'demo-01',payload:{text:'Moraleja',source_id:'Ejemplo construido',page:'No corresponde',components:[]}},
 {id:'EJEMPLO-T02',partition:'desarrollo',kind:'texto',title:'Ejemplo de palabra compartida',ordinal:2,content_hash:'demo-02',payload:{text:'llama',source_id:'Ejemplo construido',page:'No corresponde',components:[]}},
 {id:'EJEMPLO-L01',partition:'linguistica',kind:'entrada',title:'Ficha de práctica',ordinal:3,content_hash:'demo-03',payload:{text:'Ejemplo de ficha lingüística',category:'sustantivo',components:[{id:'ejemplo-categoria',type:'categoria',data:{forma:'Forma de práctica',categoria:'Sustantivo',fuente:'Ejemplo de uso de la herramienta; no es un dato lingüístico'}}]}}
];
export class DemoApi{
 constructor(){this.session={user:{id:'practice',email:'Modo de práctica'}};this.data=JSON.parse(sessionStorage.getItem('review-demo')||'{"decisions":{},"events":[]}');}
 async load(){return {items:structuredClone(demoItems),decisions:this.data.decisions,last:this.data.last};}
 async rpc(name,p){if(name==='reveal_proposal')return {'Etiqueta propuesta':p.p_item==='EJEMPLO-T01'?'Español':'Evidencia insuficiente','Motivo':'Ejemplo construido para practicar la navegación.'};
 if(name==='finish_review')return {id:'practica',created_at:new Date().toISOString()};
 const old=this.data.decisions[p.p_item];if((old?.version||0)!==p.p_expected)throw Error('VERSION_CONFLICT');
 const d={user_id:'practice',item_id:p.p_item,body:p.p_body,state:p.p_state,version:(old?.version||0)+1,updated_at:new Date().toISOString(),content_hash:p.p_hash,operation_id:p.p_operation};
 this.data.decisions[p.p_item]=d;this.data.last=p.p_item;this.data.events.unshift({...d,action:'save',body:{body:p.p_body,state:p.p_state}});sessionStorage.setItem('review-demo',JSON.stringify(this.data));return d;}
 async history(id){return this.data.events.filter(e=>e.item_id===id);}
 async logout(){}
}
