import {readFileSync,existsSync,readdirSync} from "node:fs";
import path from "node:path";

const base=process.cwd();
const host=process.env.SITE_HOST;
const expectNoindex=process.env.SITE_EXPECT_NOINDEX==="yes";
const expectedCount=Number(process.env.SITE_SITEMAP_EXPECTED||"0");

function tags(html,name){
  const re=new RegExp("<"+name+"\\b[^>]*>","gi");
  return [...html.matchAll(re)].map(x=>x[0]);
}
function attribute(tag,name){
  const pattern=new RegExp("(?:^|\\s)"+name+"\\s*=\\s*([\"'])(.*?)\\1","i");
  return tag.match(pattern)?.[2]||"";
}
function namedMeta(html,name){
  return tags(html,"meta").find(tag=>attribute(tag,"name").toLowerCase()===name)||"";
}
function canonicalTag(html){
  return tags(html,"link").find(tag=>attribute(tag,"rel").toLowerCase().split(/\s+/).includes("canonical"))||"";
}
function auditPage(html,expectedUrl,noindexRequired){
  const problems=[];
  const titles=[...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const title=(titles[0]?.[1]||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
  if(titles.length!==1||!title)problems.push("requires one nonempty title");
  const description=attribute(namedMeta(html,"description"),"content").trim();
  if(!description||description.length<35)problems.push("missing or very short meta description");
  const h1=tags(html,"h1");
  if(h1.length!==1)problems.push("requires exactly one H1 (found "+h1.length+")");
  const canonical=attribute(canonicalTag(html),"href");
  if(canonical!==expectedUrl)problems.push("canonical mismatch: "+canonical);
  const directive=attribute(namedMeta(html,"robots"),"content").toLowerCase();
  const hasNoindex=/(^|[\s,])noindex($|[\s,])/.test(directive);
  if(hasNoindex!==noindexRequired)problems.push("noindex policy mismatch");
  const schema=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for(const match of html.matchAll(schema)){
    try{JSON.parse(match[1]);}catch{problems.push("invalid JSON-LD syntax");}
  }
  return {problems,title,description};
}
function checkSitemap(xml,domain,expectedMin){
  const problems=[],urls=[];
  const escaped=xml.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)||[];
  for(const match of escaped){
    const raw=match.replace(/^<loc\b[^>]*>/i,"").replace(/<\/loc>$/i,"").replace(/&amp;/g,"&").trim();
    try{
      const u=new URL(raw);
      if(u.origin!=="https://"+domain||u.search||u.hash)problems.push("unexpected sitemap origin/query/fragment: "+raw);
      if(!u.pathname.endsWith("/"))problems.push("sitemap URL needs canonical trailing slash: "+raw);
      urls.push(raw);
    }catch{problems.push("invalid sitemap URL: "+raw);}
  }
  if(urls.length<expectedMin)problems.push("sitemap unexpectedly shrank: "+urls.length+" vs minimum "+expectedMin);
  if(new Set(urls).size!==urls.length)problems.push("duplicate sitemap <loc>");
  if(!urls.length)problems.push("sitemap contains no URLs");
  return {problems,urls};
}
function isPublicSitemapCandidate(file,html) {
  if(file==="404.html"||file==="public/index.html")return false;
  const directive=attribute(namedMeta(html,"robots"),"content").toLowerCase();
  return !/(^|[\s,])noindex($|[\s,])/.test(directive);
}
function findHtml(folder,baseFolder=folder) {
  const entries=[];
  for(const item of readdirSync(folder,{withFileTypes:true})){
    if(item.isDirectory()){
      if(![".git",".github","docs","scripts","node_modules","public","functions","tests","outreach","branding"].includes(item.name))
        entries.push(...findHtml(path.join(folder,item.name),baseFolder));
    }else if(item.isFile()&&item.name.endsWith(".html")){
      entries.push(path.relative(baseFolder,path.join(folder,item.name)).replaceAll(path.sep,"/"));
    }
  }
  return entries;
}
function selfTest(){
 const url="https://example.test/";
 const sample='<html><head><title>Unique example title</title><meta name="description" content="A clear description that is much longer than thirty-five characters."><link rel="canonical" href="'+url+'"><meta name="robots" content="index,follow"><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>Test</h1></body></html>';
 if(auditPage(sample,url,false).problems.length)throw Error("Healthy HTML fixture rejected");
 for(const [name,bad] of [
  ["duplicate H1",sample.replace("</body>","<h1>More</h1></body>")],
  ["bad canonical",sample.replace(url,'https://incorrect.test/')],
  ["accidental noindex",sample.replace("index,follow","noindex,follow")],
  ["broken structured data",sample.replace('{"@type":"Organization"}',"{bad:json}")],
  ["missing title",sample.replace("<title>Unique example title</title>","")]
 ])if(!auditPage(bad,url,false).problems.length)throw Error("Negative fixture slipped through: "+name);
 if(!checkSitemap("<urlset><url><loc>"+url+"</loc></url><url><loc>"+url+"</loc></url></urlset>","example.test",1).problems.some(x=>x.includes("duplicate")))throw Error("Duplicate sitemap fixture undetected");
 if(!checkSitemap("<urlset><url><loc>https://incorrect.test/</loc></url></urlset>","example.test",1).problems.some(x=>x.includes("origin")))throw Error("Sitemap host fixture undetected");
 if(!isPublicSitemapCandidate("services/index.html",sample))throw Error("Eligible page fixture not detected");
 if(isPublicSitemapCandidate("privacy/index.html",sample.replace("index,follow","noindex,follow")))throw Error("Intentional private noindex fixture improperly flagged");
 console.log("SEO guard negative fixtures PASS (H1, canonical, noindex, JSON-LD, titles, sitemap duplicate/host).");
}
if(process.argv.includes("--self-test"))selfTest();
else{
 if(!host)throw Error("SITE_HOST must be set");
 const problems=[];
 const sitemap=readFileSync(path.join(base,"sitemap.xml"),"utf8");
 const {problems:xmlErrors,urls}=checkSitemap(sitemap,host,expectedCount);
 problems.push(...xmlErrors);
 const knownTitles=new Map(),knownDescriptions=new Map();
 for(const url of urls){
   if(!url.startsWith("https://"+host+"/"))continue;
   const route=new URL(url).pathname;
   const file=path.join(base,route===" /"?"index.html":(route==="/"?"index.html":route.slice(1)+"index.html"));
   if(!existsSync(file)){problems.push(route+": sitemap entry has no HTML file");continue;}
   const html=readFileSync(file,"utf8");
   const result=auditPage(html,url,expectNoindex);
   for(const issue of result.problems)problems.push(route+": "+issue);
   if(result.title){
     if(knownTitles.has(result.title))problems.push(route+": duplicate title also on "+knownTitles.get(result.title));
     else knownTitles.set(result.title,route);
   }
   if(result.description){
     if(knownDescriptions.has(result.description))problems.push(route+": duplicate meta description also on "+knownDescriptions.get(result.description));
     else knownDescriptions.set(result.description,route);
   }
 }
 // Ensure ordinary public HTML pages are not silently orphaned from the sitemap.
 const inSitemap=new Set(urls);
 for(const file of findHtml(base)){
   const html=readFileSync(path.join(base,file),"utf8");
   if(!isPublicSitemapCandidate(file,html))continue;
   const expected="https://"+host+"/"+file.replace(/index\.html$/,"");
   if(!inSitemap.has(expected))problems.push(file+": indexable public page missing from sitemap");
 }
 const headers=existsSync(path.join(base,"_headers"))?readFileSync(path.join(base,"_headers"),"utf8"):"";
 const globalNoindex=/\/\*\s*[\r\n]+(?:\s+[^\r\n]*[\r\n]+)*?\s+X-Robots-Tag:\s*noindex/i.test(headers);
 if(globalNoindex!==expectNoindex)problems.push("_headers: global noindex does not match launch-state expectation");
 console.log("SEO regression guard: "+urls.length+" sitemap URLs checked for "+host+"; launch policy="+(expectNoindex?"noindex":"index-eligible")+".");
 for(const problem of problems)console.error("ERROR "+problem);
 if(problems.length)process.exitCode=1;
 else console.log("PASS: sitemap parity, unique snippets, canonical, H1, robots, schema syntax and launch headers.");
}
