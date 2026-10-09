import{readFileSync,existsSync,readdirSync,mkdirSync,writeFileSync,appendFileSync}from"node:fs";
import path from"node:path";
const conf=JSON.parse(readFileSync("quality-monitor.json","utf8")),domain=conf.domain,base="https://"+domain,mode=process.argv[2],stage=process.env.SITE_MODE||"development",rows=[];
const log=(level,check,detail)=>{rows.push({level,check,detail});console.log(level,check,detail)};
const noindex=s=>/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex/i.test(s);
const canon=s=>[...s.matchAll(/<link\b[^>]*>/gi)].map(x=>x[0]).find(x=>/\brel=["']canonical["']/i.test(x))?.match(/\bhref=["']([^"']+)["']/i)?.[1]||"";
const locs=s=>[...s.matchAll(/<loc\b[^>]*>([^<]+)<\/loc>/gi)].map(x=>x[1].trim().replaceAll("&amp;","&"));
function sensitive(p,s,type){
 if(p==="/.git/config")return /\[core\][\s\S]*repositoryformatversion/.test(s);
 if(p==="/.env")return /(?:^|\n)(?:API_KEY|DATABASE_URL|RESEND_API_KEY|STRIPE_SECRET_KEY|GITHUB_TOKEN|SECRET_KEY)\s*=/i.test(s);
 if(p==="/package.json")return /application\/json/i.test(type)&&/^\s*\{[\s\S]*"(?:scripts|dependencies|devDependencies)"\s*:/.test(s);
 if(p==="/wrangler.toml")return /(?:^|\n)\s*(?:main|compatibility_date|account_id|APP_MODE)\s*=/i.test(s);
 return false;
}
async function request(url){
 try{const r=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(15000),headers:{"User-Agent":"PortfolioMaintenance/1.0"}});
 return{status:r.status,body:(await r.text()).slice(0,350000),headers:r.headers,url:r.url};}
 catch(e){return{error:String(e.message||e).slice(0,120)}}
}
function scan(folder,rel=""){
 for(const ent of readdirSync(folder,{withFileTypes:true})){
 if([".git",".github","node_modules","docs","tests","quality-artifacts","maintenance-artifacts"].includes(ent.name))continue;
 const src=path.join(folder,ent.name),id=path.join(rel,ent.name);
 if(ent.isDirectory())scan(src,id);
 else if(ent.isFile()&&/\.(?:js|html|json|toml|env)$/.test(id)){
 const s=readFileSync(src,"utf8");
 if([/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bghp_[A-Za-z0-9]{30,}/,/\bsk_live_[A-Za-z0-9]{16,}/,/\bAKIA[0-9A-Z]{16}\b/].some(rx=>rx.test(s)))
 log("FAIL","Possible committed credential",id+" (credential value deliberately withheld)");
 }}
}
async function security(){
 scan(".");
 const r=await request(base+"/");
 if(r.error){log("UNKNOWN","Homepage availability",r.error);return;}
 log(r.status===200?"PASS":"FAIL","Homepage status","HTTP "+r.status);
 if(new URL(r.url).hostname!==domain)log("WARN","Final canonical host",new URL(r.url).hostname);
 for(const [header,want] of [["x-content-type-options","nosniff"],["referrer-policy",null]]){
 const value=r.headers.get(header);
 log(!value||want&&value.toLowerCase()!==want?"WARN":"PASS",header,value||"Missing response header");
 }
 log(r.headers.get("x-frame-options")||/frame-ancestors/i.test(r.headers.get("content-security-policy")||"")?"PASS":"WARN","Clickjacking protection","Frame policy on response");
 if(conf.intentionalNoindex&&!noindex(r.body)&&!/noindex/i.test(r.headers.get("x-robots-tag")||""))
 log("FAIL","Deliberate noindex gate","Homepage has neither noindex response header nor robots meta");
 for(const file of["/.env","/.git/config","/package.json","/wrangler.toml"]){
 const res=await request(base+file);
 if(res.error){log("UNKNOWN","Public sensitive file "+file,res.error);continue;}
 const exposed=res.status===200&&sensitive(file,res.body,res.headers.get("content-type")||"");
 log(exposed?"FAIL":"PASS","Public sensitive file "+file,exposed?"Recognisable sensitive file exposed":"No matching sensitive file detected; HTTP "+res.status);
 }
}
async function monthly(){
 const r=await request(base+"/sitemap.xml");
 if(r.error){log("UNKNOWN","Production sitemap",r.error);return;}
 if(r.status!==200){log("FAIL","Production sitemap","HTTP "+r.status);return;}
 const urls=locs(r.body);
 if(!urls.length||urls.length>70){log("FAIL","Sitemap loc count",String(urls.length));return;}
 log(new Set(urls).size===urls.length?"PASS":"FAIL","Sitemap uniqueness",urls.length+" entries");
 for(let i=0;i<urls.length;i+=5)await Promise.all(urls.slice(i,i+5).map(async u=>{
 let parsed;try{parsed=new URL(u);}catch{log("FAIL","Invalid sitemap URL","Non-URL string");return;}
 if(parsed.origin!==base){log("FAIL","Sitemap origin",parsed.hostname);return;}
 const html=await request(u);
 if(html.error){log("UNKNOWN",parsed.pathname,html.error);return;}
 if(html.status!==200){log("FAIL",parsed.pathname,"HTTP "+html.status);return;}
 const c=canon(html.body);
 log(c===u?"PASS":"FAIL","Canonical "+parsed.pathname,c===u?"HTTP 200 and matching canonical":"Expected "+u+"; found "+(c||"missing"));
 if(conf.intentionalNoindex&&!noindex(html.body)&&!/noindex/i.test(html.headers.get("x-robots-tag")||""))
 log("FAIL","Noindex "+parsed.pathname,"Pre-launch noindex missing");
 }));
 log("UNKNOWN","Google indexing and search impressions","Search Console credentials/data not connected; source SEO checks do not prove indexing");
 log("UNKNOWN","Actual enquiries, conversion and revenue","Verified privacy-safe analytics/CRM or booking aggregates not connected");
 log("UNKNOWN","Field Core Web Vitals","Requires real-user performance measurements; Lighthouse is a separate laboratory report");
}
function report(){
 mkdirSync("maintenance-artifacts",{recursive:true});
 const title=mode==="security"?"Weekly security review":"Monthly SEO/performance/conversion review";
 const md=["## "+title+" — "+conf.site,"","**Production:** "+base+"  |  **UTC:** "+new Date().toISOString()+"  |  **Site mode:** "+stage,"","| Status | Check | Result |","|---|---|---|",
 ...rows.map(r=>"| "+r.level+" | "+r.check.replaceAll("|","/")+" | "+r.detail.replaceAll("|","/").replaceAll("\n"," ").slice(0,160)+" |"),
 "","UNKNOWN is not PASS. This cannot replace penetration testing, a real-device audit, GSC inspection, legal signoff or evidence of actual payments.",
 "No Copilot credits, automatic content changes, auto-merges or third-party tracking are used."
 ].join("\n");
 writeFileSync("maintenance-artifacts/"+mode+".md",md+"\n");
 writeFileSync("maintenance-artifacts/"+mode+".json",JSON.stringify({site:conf.site,mode,stage,at:new Date().toISOString(),rows},null,2));
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,md+"\n");
 if(rows.some(x=>x.level==="FAIL"))process.exitCode=1;
 console.log("REVIEW_SUMMARY "+JSON.stringify({mode,total:rows.length,fail:rows.filter(x=>x.level==="FAIL").length,unknown:rows.filter(x=>x.level==="UNKNOWN").length}));
}
if(mode==="--self-test"){
 if(!noindex('<meta name="robots" content="noindex,follow">')||noindex('<meta name="robots" content="index,follow">'))throw Error("robots classification failed");
 if(canon('<link rel="canonical" href="https://example.co.uk/">')!=="https://example.co.uk/")throw Error("canonical parsing failed");
 if(!sensitive("/.git/config","[core]\nrepositoryformatversion = 0","text/plain"))throw Error("private source detector failed");
 if(sensitive("/.env","<!doctype html><title>Home</title>","text/html"))throw Error("false positive for SPA fallback");
 if(locs('<loc>https://example.co.uk/</loc>').length!==1)throw Error("sitemap parser failed");
 console.log("Maintenance script negative and positive fixtures PASS");
}else if(mode==="security"||mode==="monthly"){if(!/^[a-z0-9.-]+\.co\.uk$/.test(domain))throw Error("Invalid domain");if(mode==="security")await security();else await monthly();report();}
else throw Error("Usage: node scripts/site-maintenance.mjs --self-test|security|monthly");
