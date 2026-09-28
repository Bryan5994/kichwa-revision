export const LABELS=['Kichwa','Español','Mixto','Evidencia insuficiente'];
export const PARTITIONS={desarrollo:'Textos de desarrollo',reserva:'Textos de evaluación reservada',aptitud:'Revisar aptitud de unidades',linguistica:'Contenido lingüístico'};
export const STATES={pending:'Pendiente',draft:'Borrador',completed:'Revisado',doubt:'Consulta pendiente',rejected:'Descartado con motivo'};
export function validate(item,body,state){
 if(!['draft','completed','doubt','rejected'].includes(state))return 'Estado no válido.';
 if(['doubt','rejected'].includes(state)&&!body.notes?.trim())return 'Explica el motivo en Observaciones.';
 if(state!=='completed')return '';
 if(!body.source_checked)return 'Confirma que revisaste la fuente original.';
 if(item.kind==='texto'&&!LABELS.includes(body.label))return 'Elige el idioma del fragmento.';
 if(item.partition==='aptitud'&&!['apta','retenida','excluida'].includes(body.aptitude))return 'Indica la aptitud de esta unidad.';
 for(const c of item.payload.components||[]){const v=body.components?.[c.id];
  if(!['confirmed','corrected','rejected'].includes(v?.decision))return 'Falta revisar al menos un campo de esta ficha.';
  if(['corrected','rejected'].includes(v.decision)&&!v.notes?.trim())return 'Explica el motivo de cada corrección o rechazo.';
  if(v.decision==='corrected'&&!v.correction?.trim())return 'Escribe el contenido corregido.';
 }
 return '';
}
export function csv(rows){if(!rows.length)return '';const cols=Object.keys(rows[0]);const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\ufeff'+[cols,...rows.map(r=>cols.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\r\n');}
export function counts(items,decisions){const r={total:items.length,completed:0,draft:0,doubt:0,rejected:0,pending:0};for(const i of items)r[decisions[i.id]?.state||'pending']++;return r;}
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function nextPending(items,decisions,current){const start=items.findIndex(i=>i.id===current);for(let n=1;n<=items.length;n++){const i=items[(start+n)%items.length];if(!['completed','rejected'].includes(decisions[i.id]?.state))return i;}return null;}
