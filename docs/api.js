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
 async acceptInvite(hash=location.hash){const p=new URLSearchParams(hash.replace(/^#/,''));if(p.get('type')!=='invite')return false;history.replaceState(null,'',location.pathname+location.search);const access_token=p.get('access_token'),refresh_token=p.get('refresh_token'),expires_in=Number(p.get('expires_in'));if(!access_token||!refresh_token||!Number.isFinite(expires_in)||expires_in<=0)throw new ApiError('Enlace de activación incompleto. Solicita uno nuevo al responsable.',400);const previous=this.session;this.session={access_token,refresh_token,expires_in,expires_at:Math.floor(Date.now()/1000)+expires_in};try{const result=await this.request('/auth/v1/user');this.session.user=result.user||result;if(!this.session.user?.id)throw new ApiError('No se pudo verificar la cuenta.',401);this.setSession(this.session);return true;}catch(e){this.session=previous;throw e;}}
 async setPassword(password){return this.request('/auth/v1/user',{method:'PUT',body:{password}});}
 async refresh(){if(this.refreshing)return this.refreshing;this.refreshing=this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token},auth:false}).then(s=>this.setSession(s)).finally(()=>this.refreshing=null);return this.refreshing;}
 async logout(){try{await this.request('/auth/v1/logout',{method:'POST'});}finally{this.session=null;this.storage.removeItem('review-session');}}
 async all(table,query=''){let out=[];for(let offset=0;;offset+=500){const page=await this.request(`/rest/v1/${table}?select=*&${query}${query?'&':''}limit=500&offset=${offset}`);out.push(...page);if(page.length<500)return out;}}
 async load(){await this.rpc('claim_review_access',{});const [items,decisions,sessions]=await Promise.all([this.all('review_items','order=ordinal.asc'),this.all('review_decisions','order=item_id.asc'),this.all('review_sessions')]);return {items,decisions:Object.fromEntries(decisions.map(d=>[d.item_id,d])),last:sessions[0]?.last_item};}
 rpc(name,body){return this.request('/rest/v1/rpc/'+name,{method:'POST',body});}
 async asset(path){const r=await this.request('/storage/v1/object/sign/review-evidence/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',body:{expiresIn:1800}});return this.config.url+'/storage/v1'+r.signedURL;}
 history(id){return this.all('review_events','item_id=eq.'+encodeURIComponent(id)+'&order=id.desc');}
}
