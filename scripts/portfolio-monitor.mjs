// Shared, no-API-key quality monitor. This exact module is mirrored in four websites.
// Browser inspections run in GitHub Actions; only generic, non-PII diagnostics are stored.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {chromium} from "playwright";
import AxeBuilder from "@axe-core/playwright";
const cfg=JSON.parse(readFileSync("quality-monitor.json","utf8"));
const root=(process.env.MONITOR_BASE_URL||"https://"+cfg.domain).replace(/\/$/,"");
const checks=[];mkdirSync("quality-artifacts",{recursive:true});
function safeId(x){return x.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase().slice(0,65);}
async function check(id,name,fn){
 try{await fn();checks.push({id,name,ok:true});console.log("PASS",name);}
 catch(e){const detail=String(e?.message||e).slice(0,1200);checks.push({id,name,ok:false,detail});console.error("FAIL",name,detail);}
}
function assert(condition,message){if(!condition)throw Error(message);}
const browser=await chromium.launch({headless:true});
try {
 for (const route of cfg.routes) {
  const id="route-"+safeId(route||"home");
  await check(id,"Page loads and is structured: "+route,async()=>{
   const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:"reduce"});
   try{
    const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e.message).slice(0,160)));
    const res=await page.goto(root+route,{waitUntil:"domcontentloaded",timeout:30000});
    assert(res&&res.status()<400,"HTTP "+(res?.status()??"no response")+" at "+route);
    const main=page.locator("main");assert(await main.count()>0,"Missing main landmark");
    const headings=await page.locator("main h1").count();assert(headings===1,"Expected one main H1, found "+headings);
    const title=await page.title();assert(title.trim().length>=8,"Missing meaningful title");
    const canonical=await page.locator('link[rel="canonical"]').first().getAttribute("href").catch(()=>null);
    assert(Boolean(canonical)&&canonical.startsWith("https://"+cfg.domain+"/"),"Incorrect or absent canonical URL");
    await page.waitForTimeout(250);
    assert(jsErrors.length===0,"Browser JavaScript error: "+jsErrors.join("; "));
   } finally{await page.close();}
  });
 }
 await check("crawl-basics","Robots and sitemap are reachable",async()=>{
  const context=await browser.newContext();try{
   for(const [path,needle] of [["/robots.txt","Sitemap:"],["/sitemap.xml","<urlset"]]){
    const response=await context.request.get(root+path,{timeout:30000});
    assert(response.status()<400,path+" returned HTTP "+response.status());
    assert((await response.text()).includes(needle),path+" does not contain "+needle);
   }
  }finally{await context.close();}
 });
 await check("primary-navigation","Primary internal navigation links resolve",async()=>{
  const page=await browser.newPage();try{
   const r=await page.goto(root+"/",{waitUntil:"domcontentloaded",timeout:30000});
   assert(r&&r.ok(),"Homepage unavailable");
   const raw=await page.locator('header nav a[href], nav[aria-label="Main navigation"] a[href], nav[aria-label="Primary navigation"] a[href]').evaluateAll(a=>a.map(x=>x.getAttribute("href")).filter(Boolean));
   const local=[...new Set(raw.filter(x=>x.startsWith("/")&&!x.startsWith("//")))].slice(0,12);
   for(const href of local) {
    const path=href.split("#")[0].split("?")[0];if(!path)continue;
    const response=await page.request.get(root+path,{timeout:20000});
    assert(response.status()<400,href+" returns HTTP "+response.status());
   }
  }finally{await page.close();}
 });
 for(const width of [375,1440]){
  await check("layout-"+width,"Homepage has no horizontal overflow at "+width+"px",async()=>{
   const page=await browser.newPage({viewport:{width,height:820},reducedMotion:"reduce"});
   try{
    await page.goto(root+"/",{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForTimeout(350);
    const dims=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
    assert(dims.doc<=dims.view+2,"Horizontal overflow "+dims.doc+"px > "+dims.view+"px");
    await page.screenshot({path:"quality-artifacts/home-"+width+".png",fullPage:true,animations:"disabled",timeout:25000});
   }finally{await page.close();}
  });
 }
 await check("mobile-navigation","Mobile menu opens and closes accessibly",async()=>{
  const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:"reduce"});
  try{
   await page.goto(root+"/",{waitUntil:"domcontentloaded",timeout:30000});
   const btn=page.locator('button[aria-expanded][aria-controls],button#menu-toggle').first();
   if(await btn.count()===0||!(await btn.isVisible()))return; // not every site has collapsed menu
   await btn.click({timeout:10000});
   assert(await btn.getAttribute("aria-expanded")==="true","Menu did not declare aria-expanded=true after opening");
   await page.keyboard.press("Escape");
   assert(await btn.getAttribute("aria-expanded")==="false","Menu did not close on Escape");
  }finally{await page.close();}
 });
 await check("conversion-surface","Primary enquiry/booking entry exists",async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
   const response=await page.goto(root+cfg.conversionRoute,{waitUntil:"domcontentloaded",timeout:30000});
   assert(response&&response.ok(),"Conversion page unavailable");
   const control=page.locator(cfg.conversionSelector);
   assert(await control.count()>0,"Missing conversion surface "+cfg.conversionSelector);
   await page.screenshot({path:"quality-artifacts/conversion-mobile.png",fullPage:true,animations:"disabled",timeout:25000});
  }finally{await page.close();}
 });
 await check("accessibility-critical","No critical/serious automated WCAG findings on homepage",async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:"reduce"});
  try{
   await page.goto(root+"/",{waitUntil:"domcontentloaded",timeout:30000});
   const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
   const severe=results.violations.filter(x=>x.impact==="serious"||x.impact==="critical");
   assert(!severe.length,severe.map(x=>x.id+": "+x.help+" ("+x.nodes.length+" elements)").join("; ").slice(0,1200));
  }finally{await page.close();}
 });
}finally{await browser.close();}
const summary={site:cfg.site,domain:cfg.domain,checkedAt:new Date().toISOString(),baseUrl:root,checks};
writeFileSync("quality-artifacts/report.json",JSON.stringify(summary,null,2)+"\n");
const bad=checks.filter(c=>!c.ok);
console.log(JSON.stringify({site:cfg.site,total:checks.length,failed:bad.map(c=>c.id)}));
if(bad.length)process.exitCode=1;
