// Auto-file only failed, scheduled production checks. No AI, keys or third-party service.
const fs=require("node:fs");
module.exports=async function syncQualityIssues({github,context,core}){
 const file="quality-artifacts/report.json";
 if(!fs.existsSync(file)){core.warning("Browser report unavailable: inspect the workflow logs; no GitHub issue created.");return;}
 const report=JSON.parse(fs.readFileSync(file,"utf8"));
 const owner=context.repo.owner,repo=context.repo.repo;
 const current=await github.paginate(github.rest.issues.listForRepo,{owner,repo,state:"all",per_page:100});
 const runUrl="https://github.com/"+owner+"/"+repo+"/actions/runs/"+context.runId;
 for(const check of report.checks){
  const marker="<!-- free-quality-monitor:"+check.id+" -->";
  const existing=current.find(x=>!x.pull_request&&(x.body||"").includes(marker));
  if(check.ok){
   if(existing?.state==="open"){
    await github.rest.issues.update({owner,repo,issue_number:existing.number,state:"closed",state_reason:"completed"});
    core.info("Resolved monitor issue #"+existing.number+": "+check.id);
   }
   continue;
  }
  if(existing?.state==="open"){core.info("Issue still open; no repetitive update: #"+existing.number);continue;}
  if(existing?.state_reason==="not_planned"){core.info("Owner suppressed finding "+check.id);continue;}
  const title="[Quality monitor] "+check.name.slice(0,160);
  const body=marker+"\nAutomated production browser audit for **"+report.site+"**.\n\n**Check:** "+check.name+
   "\n\n**Problem:**\n\n\`\`\`text\n"+String(check.detail||"Unknown failure").replace(/\`/g,"'").slice(0,950)+"\n\`\`\`"+
   "\n\n**Evidence:** [workflow run]("+runUrl+") (screenshots and JSON report may be available as Actions artifacts)."+
   "\n\n**Next action:** reproduce, implement a safe fix through a PR, and wait for the next production audit to confirm recovery. Do not infer live financial or customer-data readiness from this monitor.";
  if(existing){
   await github.rest.issues.update({owner,repo,issue_number:existing.number,state:"open",title,body});
   core.info("Reopened regression #"+existing.number+": "+check.id);
  }else{
   const made=await github.rest.issues.create({owner,repo,title,body});
   core.info("Opened monitor issue #"+made.data.number+": "+check.id);
  }
 }
};
