import {Api} from './api.js';

// El responsable usa fichas y fuentes reales, pero ninguna decisión sale del navegador.
// La cuenta tampoco recibe review_access: el servidor rechaza save_review.
export class PreviewApi extends Api {
 constructor(config,storage=sessionStorage){super(config,storage);this.preview=true;this.trial={decisions:{},events:[],last:null};this.reviewerId=null;}
 async load(){
  const maps=await this.all('review_inspectors');
  if(maps.length!==1||maps[0].user_id!==this.session?.user?.id)throw Error('Esta cuenta no tiene acceso de inspección.');
  const [items,saved,sessions]=await Promise.all([this.all('review_items','order=ordinal.asc'),this.all('review_decisions','order=item_id.asc'),this.all('review_sessions')]);
  const expected={desarrollo:66,aptitud:14,reserva:40,linguistica:2183};
  for(const [partition,n] of Object.entries(expected))if(items.filter(i=>i.partition===partition).length!==n)throw Error('El inventario de '+partition+' no coincide; se detuvo la carga.');
  this.reviewerId=maps[0].reviewer_id;
  this.trial={decisions:Object.fromEntries(saved.filter(d=>d.user_id===this.reviewerId).map(d=>[d.item_id,d])),events:[],last:sessions.find(s=>s.user_id===this.reviewerId)?.last_item||null};
  return {items,decisions:this.trial.decisions,last:this.trial.last};
 }
 async rpc(name,p){
  if(name==='reveal_proposal'){
   const proposals=await this.all('review_proposals','item_id=eq.'+encodeURIComponent(p.p_item));
   if(!proposals.length)throw Error('No hay propuesta visible para esta ficha.');
   return proposals[0].payload;
  }
  if(name==='finish_review')return {id:'ENSAYO-SIN-GUARDAR',created_at:new Date().toISOString()};
  if(name!=='save_review')throw Error('Operación no disponible en el ensayo.');
  const old=this.trial.decisions[p.p_item];
  if((old?.version||0)!==p.p_expected)throw Error('VERSION_CONFLICT');
  const d={user_id:this.session.user.id,item_id:p.p_item,body:structuredClone(p.p_body),state:p.p_state,version:(old?.version||0)+1,updated_at:new Date().toISOString(),content_hash:p.p_hash,operation_id:p.p_operation};
  this.trial.decisions[p.p_item]=d;this.trial.last=p.p_item;
  this.trial.events.unshift({...d,action:'ensayo_sin_guardar',body:{body:d.body,state:d.state}});
  return d;
 }
 async history(id){const saved=await super.history(id);return [...this.trial.events.filter(e=>e.item_id===id),...saved.filter(e=>e.user_id===this.reviewerId)];}
 async all(table,query=''){if(table==='review_events')return [...this.trial.events,...(await super.all(table,query)).filter(e=>e.user_id===this.reviewerId)];return super.all(table,query);}
}
