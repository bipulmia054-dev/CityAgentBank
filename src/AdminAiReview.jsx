import React,{useEffect,useRef,useState} from 'react';
import {readJson} from './api-response.js';
import {reviewFields,readPath,applyProposals,undoChanges,remainingItems} from './ekyc-review.js';

export default function AdminAiReview({caseData,onChange,customerId,flush,getRevision,history=[]}){
  const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[selected,setSelected]=useState([]),[message,setMessage]=useState(''),[income,setIncome]=useState(null);
  const latest=useRef(caseData);latest.current=caseData;
  const baseline=useRef(null), mounted=useRef(true);
  const [retryMode,setRetryMode]=useState(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{let cancelled=false;fetch(`/api/customers/${customerId}/income-declaration-card`).then(readJson).then(r=>{if(!cancelled)setIncome(r.error?null:!!r.documents?.some(d=>d.pages?.length===1));}).catch(()=>{});return()=>{cancelled=true;};},[customerId]);
  const fields=reviewFields(caseData),labels=new Map(fields.map(f=>[f.path,f.label])),locks=caseData.aiReview?.locks||[];
  const remaining=remainingItems(caseData,{income});
  async function process(mode){
    if(!confirm('এই customer-এর NID Front/Back, uploaded Income Declaration এবং প্রয়োজনীয় তথ্য Gemini API-তে পাঠিয়ে AI প্রস্তাব তৈরি করবেন? ফলাফল যাচাই করে Apply করতে হবে।'))return;
    setBusy(true);setRetryMode(null);setMessage('');setResult(null);setSelected([]);
    try{
      if(!(await flush()))throw Error('আগের পরিবর্তন Save হয়নি। আগে Save error ঠিক করুন।');
      const snapshot=latest.current;const revision=getRevision();
      const r=await fetch(`/api/admin/customers/${customerId}/ai-prepare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,revision})});
      const output=await readJson(r);if(!r.ok)throw Error(output.error||'AI processing হয়নি');
      if(!mounted.current)return;
      if(snapshot!==latest.current||getRevision()!==output.revision)throw Error('Processing-এর সময় তথ্য বদলেছে। আবার Process করুন।');
      baseline.current=snapshot;setResult(output);setMessage(output.proposals?.length?'প্রস্তাবগুলো মিলিয়ে নির্বাচন করুন; এখনো কোনো তথ্য বদলায়নি।':'নিশ্চিত নতুন প্রস্তাব পাওয়া যায়নি। বাকি তথ্য manual review করুন।');
    }catch(e){if(mounted.current){setMessage(e.message);setRetryMode(mode);}}finally{if(mounted.current)setBusy(false);}
  }
  function apply(){
    if(baseline.current!==caseData){setMessage('তথ্য বদলেছে—আবার Process করুন।');return;}
    const next=applyProposals(caseData,result.proposals,selected);
    if(next!==caseData)onChange(next,'AI Apply');
    setResult(null);setSelected([]);setMessage('নির্বাচিত প্রস্তাব Auto-save-এ দেওয়া হয়েছে। Save status দেখুন।');
  }
  function toggleLock(path){onChange({...caseData,aiReview:{...caseData.aiReview,locks:locks.includes(path)?locks.filter(p=>p!==path):[...locks,path]}});setResult(null);}
  return <section className="aiReviewPanel">
    <div className="aiReviewHeading"><div><small>ADMIN ASSISTANT · REVIEW BEFORE APPLY</small><h2>AI eKYC প্রস্তুতি</h2><p>NID → তথ্য তুলনা → Admin যাচাই → Autofill</p></div><span className={remaining.length?'aiBadge pending':'aiBadge'}>{remaining.length?`${remaining.length}টি যাচাই বাকি`:'eKYC তথ্য প্রস্তুত ✓'}</span></div>
    <details className="aiChecklist"><summary>বাকি কাজের তালিকা ({remaining.length})</summary>{remaining.length?<ul>{remaining.map(item=><li key={item}>{item}</li>)}</ul>:<p>এই checklist-এর প্রয়োজনীয় ঘরগুলো পূর্ণ। ব্যাংকের verification/final submit আলাদা।</p>}<p>Email না থাকলে খালি রাখা যায়। সঠিকতা নিশ্চিত করতে NID ও customer declaration মিলিয়ে দেখুন।</p></details>
    <div className="aiActions"><button className="primary" disabled={busy} onClick={()=>process('all')}>{busy?'AI processing চলছে…':'AI দিয়ে সব তথ্য প্রস্তুত করুন'}</button><button className="secondary" disabled={busy} onClick={()=>process('missing')}>শুধু খালি ঘর প্রস্তুত করুন</button></div>
    <p className="aiNotice">AI ভুল করতে পারে। অস্পষ্ট তথ্য পূরণ হবে না। PEP/IP, Residency, Source of Funds ও Yearly Transactions নিজে যাচাই করুন। Lock করা ঘর AI বদলাবে না।</p>
    {message&&<p role="status">{message}</p>}
    {retryMode&&!busy&&<button className="secondary" onClick={()=>process(retryMode)}>Retry — আবার AI Process</button>}
    {result&&<div className="aiResults"><h3>আগের তথ্য বনাম AI প্রস্তাব</h3>
      {!!result.quality?.length&&<details><summary>NID ছবির মান যাচাই</summary><ul>{result.quality.map((q,i)=><li key={i}>{q.source}: {q.status} — {q.reason}</li>)}</ul></details>}
      {!!result.issues?.length&&<details open><summary>এই processing-এর সতর্কতা</summary><ul>{result.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul><small>এগুলো AI run-এর observation; উপরের বাকি তালিকা বর্তমান তথ্য অনুযায়ী বদলায়।</small></details>}
      <div className="aiTableWrap"><table><thead><tr><th>নিন</th><th>ঘর</th><th>আগে</th><th>প্রস্তাব</th><th>উৎস / প্রমাণ</th></tr></thead><tbody>{result.proposals.map(p=><tr key={p.path}><td><input aria-label={`Apply ${labels.get(p.path)||p.path}`} type="checkbox" checked={selected.includes(p.path)} onChange={e=>setSelected(e.target.checked?[...selected,p.path]:selected.filter(v=>v!==p.path))}/></td><td>{labels.get(p.path)||p.path}</td><td>{String(p.before||'—')}</td><td>{p.value}</td><td>{p.source}<small>{p.evidence}</small></td></tr>)}</tbody></table></div>
      <div className="aiActions"><button className="secondary" onClick={()=>setSelected(result.proposals.filter(p=>!p.before).map(p=>p.path))}>খালি ঘরের প্রস্তাব নির্বাচন</button><button className="primary" disabled={!selected.length} onClick={apply}>যাচাই করা {selected.length}টি Apply করুন</button><button className="secondary" onClick={()=>setResult(null)}>প্রস্তাব বাদ দিন</button></div>
    </div>}
    <details className="aiLocks"><summary>যাচাই করা তথ্য Lock ({locks.length})</summary><p>টিক দেওয়ার আগে উৎস মিলিয়ে নিন। AI Lock মানবে; হাতে edit করলে আবার যাচাই করুন।</p><div className="aiLockGrid">{fields.filter(f=>readPath(caseData,f.path)).map(f=><label key={f.path}><input type="checkbox" checked={locks.includes(f.path)} onChange={()=>toggleLock(f.path)}/><span>{f.label}<small>{String(readPath(caseData,f.path))}</small></span></label>)}</div></details>
<details className="aiHistory"><summary>পরিবর্তনের History ও Undo ({history.length})</summary><p>সর্বশেষ ২০টি save-এর eKYC text পরিবর্তন। ছবি এখানে সংরক্ষিত নয়। পরে বদলানো বা Lock করা ঘর Undo হবে না।</p>{[...history].reverse().map((entry,i)=><article key={entry.at+i}><b>{entry.actor} · {entry.origin||'Admin edit'}</b> · {new Date(entry.at).toLocaleString()}<ul>{entry.changes.map(c=><li key={c.path}>{labels.get(c.path)||c.path}: {String(c.before||'—')} → {String(c.after||'—')}</li>)}</ul><button className="secondary" onClick={()=>{if(confirm('এই save-এর অপরিবর্তিত, unlocked তথ্য আগের অবস্থায় ফিরিয়ে দেবেন?')){const next=undoChanges(caseData,entry);if(next!==caseData)onChange(next,'Undo');else setMessage('Undo করার মতো অপরিবর্তিত unlocked ঘর নেই।');setResult(null);}}}>এই পরিবর্তন Undo</button></article>)}</details>
  </section>;
}
