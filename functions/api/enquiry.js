// Cloudflare Pages Function: privacy-gated business enquiries.
// IMPORTANT: disabled until all required Cloudflare environment secrets are configured
// AND ENQUIRY_LIVE=true has been set after legal/privacy/business readiness review.
// Server-side delivery uses Resend; no secrets are exposed in website JavaScript.
const CONFIG={"repo":"elnovar-site","brand":"ELNOVAR GROUP","host":"elnovargroup.co.uk","required":["name","email","message"]};
const ALLOWED=['name','email','company','service','message','property','currentUse','size','ownership','planning','outcome','documentLink','details'];
const LIMITS={name:100,email:180,company:150,service:160,message:2500,property:250,currentUse:200,size:100,ownership:120,planning:150,outcome:400,documentLink:800,details:3500};
function active(env){return env.ENQUIRY_LIVE==='true'&&Boolean(env.RESEND_API_KEY&&env.ENQUIRY_TO&&env.ENQUIRY_FROM&&env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY);}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function clean(v,cap){return typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,cap):'';}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=180;}
export async function onRequestGet({request,env}){
 const isLive=new URL(request.url).hostname===CONFIG.host&&active(env);
 return json({live:isLive,siteKey:isLive?env.TURNSTILE_SITE_KEY:null});
}
export async function onRequestPost({request,env}){
 const url=new URL(request.url);
 if(url.hostname!==CONFIG.host||!active(env))return json({ok:false,error:'Enquiries are not yet available.'},503);
 if(request.headers.get('Origin')!==url.origin)return json({ok:false,error:'Invalid submission origin.'},403);
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({ok:false,error:'Invalid submission format.'},415);
 let payload;
 try{const raw=await request.text();if(raw.length>10000)return json({ok:false,error:'Message too large.'},413);payload=JSON.parse(raw);}catch{return json({ok:false,error:'Invalid submission.'},400);}
 if(!payload||Array.isArray(payload)||typeof payload!=='object')return json({ok:false,error:'Invalid submission.'},400);
 // Quietly discard likely automated submissions; never email the honeypot.
 if(payload.website)return json({ok:true});
 const fields=Object.fromEntries(ALLOWED.map(k=>[k,clean(payload[k],LIMITS[k])]));
 if(CONFIG.required.some(k=>!fields[k])||!validEmail(fields.email))return json({ok:false,error:'Please complete the required fields with a valid email.'},400);
 if(fields.documentLink&&(!/^https:\/\//i.test(fields.documentLink)||fields.documentLink.length>800))return json({ok:false,error:'Please provide a valid HTTPS document link.'},400);
 const token=typeof payload.turnstileToken==='string'?payload.turnstileToken:'';
 if(!token||token.length>3000)return json({ok:false,error:'Please complete the anti-spam check.'},400);
 let verified;
 try{
  const data=new FormData();data.set('secret',env.TURNSTILE_SECRET_KEY);data.set('response',token);
  const ip=request.headers.get('CF-Connecting-IP');if(ip)data.set('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:data});
  verified=await response.json();
 }catch{return json({ok:false,error:'Unable to verify the anti-spam challenge. Please retry.'},502);}
 if(!verified.success||(verified.hostname&&verified.hostname!==CONFIG.host))return json({ok:false,error:'Anti-spam verification failed. Please retry.'},400);
 const lines=['Site: '+CONFIG.host,'Form: '+CONFIG.brand,'Submitted: '+new Date().toISOString(),''];
 for(const key of ALLOWED)if(fields[key])lines.push(key+': '+fields[key]);
 const mail={from:env.ENQUIRY_FROM,to:[env.ENQUIRY_TO],reply_to:fields.email,subject:'['+CONFIG.brand+'] Website enquiry: '+(fields.company||fields.property||fields.service||fields.name).slice(0,80),text:lines.join('\n')};
 let delivered=false;
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(mail)});
  delivered=response.ok;
 }catch{}
 if(!delivered)return json({ok:false,error:'Enquiry delivery is temporarily unavailable. Please retry later.'},502);
 return json({ok:true,message:'Your enquiry has been sent.'});
}
