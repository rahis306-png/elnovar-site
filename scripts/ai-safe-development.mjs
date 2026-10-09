import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const policy=JSON.parse(readFileSync(".github/ai-safe-tasks.json","utf8"));
function verifyPolicy() {
  assert.equal(policy.version,1);
  assert(/^rahis306-png\/[a-z0-9-]+$/.test(policy.repo));
  assert(Array.isArray(policy.tasks)&&policy.tasks.length>0);
  const ids=new Set();
  for(const task of policy.tasks){
    assert(Number.isInteger(task.issue)&&task.issue>0);
    assert(!ids.has(task.issue),"Duplicate issue");
    ids.add(task.issue);
    assert(task.description.length>=30&&task.description.length<=800);
    assert(Array.isArray(task.allowedPaths)&&task.allowedPaths.length>=1&&task.allowedPaths.length<=16);
    for(const p of task.allowedPaths){
      assert(/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(p)&&!p.includes("..")&&!p.includes("//"),"Unsafe path "+p);
      assert(!p.startsWith(".github/")&&!p.startsWith("scripts/")&&!p.startsWith("src/")&&!p.startsWith("functions/"),"Protected path "+p);
      assert(!/(?:package(?:-lock)?\.json|wrangler\.toml|_headers|\.env|privacy\/|legal\/|terms\/|operator\/)/i.test(p),"Protected file "+p);
    }
  }
  console.log("Safe-issue policy valid for "+policy.repo+" ("+policy.tasks.length+" approved issues)");
}
const stage=process.argv[2];
verifyPolicy();
if(stage==="validate")process.exit(0);

const GITHUB_TOKEN=process.env.GITHUB_TOKEN;
if(!GITHUB_TOKEN)throw Error("GitHub Actions token unavailable");
if(process.env.GITHUB_REPOSITORY!==policy.repo)throw Error("Repository mismatch");
async function api(url){
  const r=await fetch("https://api.github.com/repos/"+policy.repo+url,{
    headers:{Authorization:"Bearer "+GITHUB_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}
  });
  if(r.status===404)return null;
  if(!r.ok)throw Error("GitHub API read failed: "+r.status+" "+url);
  return r.json();
}
if(stage==="pick"){
  let candidate=null;
  for(const task of policy.tasks){
    const issue=await api("/issues/"+task.issue);
    if(!issue||issue.state!=="open"||issue.pull_request)continue;
    const prior=await api("/pulls?state=all&head=rahis306-png:ai-auto/issue-"+task.issue+"&per_page=100");
    if(prior?.length)continue;
    const ref=await api("/git/ref/heads/ai-auto/issue-"+task.issue);
    if(ref)continue;
    candidate=task;
    break;
  }
  appendFileSync(process.env.GITHUB_OUTPUT,"found="+Boolean(candidate)+"\n");
  if(candidate){
    mkdirSync("/tmp/autodev-artifact",{recursive:true});
    writeFileSync("/tmp/approved-task.json",JSON.stringify(candidate));
    appendFileSync(process.env.GITHUB_OUTPUT,"issue="+candidate.issue+"\n");
    console.log("Approved issue #"+candidate.issue+" selected. No untrusted issue description passed to Copilot.");
  }else console.log("No approved open issue is ready. No AI credits will be consumed.");
}else if(stage==="verify"){
  const task=JSON.parse(readFileSync("/tmp/approved-task.json","utf8"));
  const changes=execFileSync("git",["ls-files","--modified","--others","--exclude-standard"],{encoding:"utf8"}).trim().split("\n").filter(Boolean);
  assert(changes.length>0,"AI wrote no changes; do not create empty PR");
  assert(changes.length<=8,"Too many files changed");
  const approved=new Set(task.allowedPaths);
  for(const p of changes)assert(approved.has(p),"AI modified forbidden path: "+p);
  const deleted=execFileSync("git",["ls-files","--deleted"],{encoding:"utf8"}).trim();
  assert(!deleted,"AI deleted an existing source file: "+deleted);
  execFileSync("git",["add","--",...changes]);
  const patch=execFileSync("git",["diff","--cached","--binary"],{maxBuffer:1024*1024});
  assert(patch.length>=40&&patch.length<=140000,"Invalid or oversized agent patch");
  mkdirSync("/tmp/autodev-artifact",{recursive:true});
  writeFileSync("/tmp/autodev-artifact/changes.patch",patch);
  writeFileSync("/tmp/autodev-artifact/task.json",JSON.stringify({issue:task.issue,description:task.description,changed:changes}));
  console.log("Verified AI patch for issue #"+task.issue+"; "+changes.length+" approved files; "+patch.length+" bytes.");
}else throw Error("Invalid stage "+stage);
