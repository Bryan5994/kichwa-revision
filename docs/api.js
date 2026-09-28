export class ApiError extends Error{constructor(message,status){super(message);this.status=status;}}
export class Api{
 constructor(config,storage=sessionStorage){this.config=config;this.storage=storage;this.session=JSON.parse(storage.getItem('review-session')||'null');}
 async request(path,{method='GET',body,auth=true,headers={}}={}){
  if(auth&&this.session&&this.session.expires_at*1000<Date.now()+30000)await this.refresh();
  const response=await fetch(this.config.url+path,{method,headers:{apikey:this.config.key,...(auth&&this.session?{Authorization:'Bearer '+this.session.access_token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
  const text=await response.text();let result;try{result=text?JSON.parse(text):null;}catch{throw new ApiError('Respuesta del servidor no válida. No se confirmó el guardado.',response.status);}
  if(!response.ok)throw new ApiError(result?.message||result?.error_description||result?.msg||'No se pudo conectar.',response.status);
  return result;
 }
 setSession(s){s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+s.expires_in;this.session=s;this.storage.setItem('review-session',JSON.stringify(s));}
 async login(email,password){const s=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:false});this.setSession(s);return s;}
 async refresh(){if(this.refreshing)return this.refreshing;this.refreshing=this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token},auth:false}).then(s=>this.setSession(s)).finally(()=>this.refreshing=null);return this.refreshing;}
 async logout(){try{await this.request('/auth/v1/logout',{method:'POST'});}finally{this.session=null;this.storage.removeItem('review-session');}}
 async all(table,query=''){let out=[];for(let offset=0;;offset+=500){const page=await this.request(`/rest/v1/${table}?select=*&${query}${query?'&':''}limit=500&offset=${offset}`);out.push(...page);if(page.length<500)return out;}}
 async load(){const [items,decisions,sessions]=await Promise.all([this.all('review_items','order=ordinal.asc'),this.all('review_decisions','order=item_id.asc'),this.all('review_sessions')]);return {items,decisions:Object.fromEntries(decisions.map(d=>[d.item_id,d])),last:sessions[0]?.last_item};}
 rpc(name,body){return this.request('/rest/v1/rpc/'+name,{method:'POST',body});}
 async asset(path){const r=await this.request('/storage/v1/object/sign/review-evidence/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',body:{expiresIn:1800}});return this.config.url+'/storage/v1'+r.signedURL;}
 history(id){return this.all('review_events','item_id=eq.'+encodeURIComponent(id)+'&order=id.desc');}
}
