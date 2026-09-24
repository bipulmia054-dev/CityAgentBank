import React,{useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {readJson} from './api-response.js';
import {applyProposals,fillKnownFields,lockReviewedFields,unlockReviewedFields,reviewFields,readPath} from './ekyc-review.js';

export default function AdminAiReview({caseData,onChange,customerId,flush,getRevision}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const latest=useRef(caseData);latest.current=caseData;
  const mounted=useRef(true),running=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function saveReview(lock){
    if(running.current)return;
    running.current=true;setBusy(true);setMessage('Server-এ save হচ্ছে…');
    const signature=data=>JSON.stringify([data.aiReview?.locks||[],reviewFields(data).map(f=>[f.path,readPath(data,f.path)])]);
    try{
      const next=lock?lockReviewedFields(latest.current):unlockReviewedFields(latest.current);
      const expected=signature(next);
      flushSync(()=>onChange(next,'Admin edit'));
      if(!(await flush()))throw Error('Server-এ Save হয়নি। Save error ঠিক করে আবার বাটন চাপুন।');
      if(!mounted.current)return;
      if(signature(latest.current)!==expected){setMessage('Save-এর সময় তথ্য পরিবর্তন হয়েছে। আবার মিলিয়ে Save ও Lock করুন।');return;}
      setMessage(lock?'Server-এ Saved ও AI-Locked। Extension-এ এই customer নির্বাচন করে Start Auto Fill চাপুন—নতুন saved তথ্য আসবে; শুধু Resume পুরোনো তথ্য চালায়।':'Server-এ Unlock হয়েছে। পরিবর্তন করে আবার Save ও Lock করতে পারবেন।');
    }catch(e){if(mounted.current)setMessage(e.message);}
    finally{running.current=false;if(mounted.current)setBusy(false);}
  }
  async function fill(){
    if(running.current)return;
    running.current=true;setBusy(true);setMessage('');
    try{
      const known=fillKnownFields(latest.current);
      if(known!==latest.current)flushSync(()=>onChange(known,'AI Apply'));
      if(!(await flush()))throw Error('আগের পরিবর্তন Save হয়নি। আগে Save error ঠিক করুন।');
      if(!mounted.current)return;
      const snapshot=latest.current,revision=getRevision();
      const r=await fetch(`/api/admin/customers/${customerId}/ai-prepare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'all',revision})});
      const output=await readJson(r);if(!r.ok)throw Error(output.error||'AI দিয়ে পূরণ হয়নি');
      if(!mounted.current)return;
      if(snapshot!==latest.current||getRevision()!==output.revision)throw Error('এর মধ্যে তথ্য বদলেছে, তাই AI তথ্য বসানো হয়নি। নিচে নিজে পূরণ করতে পারবেন।');
      const next=fillKnownFields(applyProposals(snapshot,output.proposals,output.proposals.map(p=>p.path)));
      if(next!==snapshot)onChange(next,'AI Apply');
      setMessage(next!==snapshot?'স্পষ্ট তথ্য নিচের ফর্মে বসেছে। Auto-save হচ্ছে—Save status দেখুন। বাকি ঘর নিজে পূরণ বা সংশোধন করুন।':'নতুন স্পষ্ট তথ্য পাওয়া যায়নি। নিচের ফর্মে বাকি ঘর নিজে পূরণ করুন।');
    }catch(e){if(mounted.current)setMessage(e.message);}
    finally{running.current=false;if(mounted.current)setBusy(false);}
  }
  return <section className="aiReviewPanel">
    <div className="aiReviewHeading"><div><h2>AI দিয়ে eKYC পূরণ</h2><p>একবার ক্লিক করুন—স্পষ্ট তথ্য সরাসরি নিচের ফর্মে বসবে ও Auto-save হবে। অজানা তথ্য নিজে পূরণ করুন।</p></div></div>
    <div className="aiActions"><button className="primary" disabled={busy} onClick={fill}>{busy?'তথ্য পূরণ হচ্ছে…':'AI দিয়ে পূরণ ও Auto-save'}</button></div>
    <div className="aiActions"><button className="primary" disabled={busy} onClick={()=>saveReview(true)}>মিলিয়ে Save ও Lock করুন</button>{!!caseData.aiReview?.locks?.length&&<button className="secondary" disabled={busy} onClick={()=>saveReview(false)}>Unlock করে পরিবর্তন করুন</button>}</div>
    <p>AI-Lock: {caseData.aiReview?.locks?.length||0}টি ঘর। Save ও Lock চাপার আগে default উত্তরগুলো গ্রাহকের সঙ্গে মিলিয়ে নিন। Lock করা ঘর AI বদলাবে না; হাতে কোনো ঘর বদলালে সেই ঘরের Lock উঠে যাবে।</p>
    <p className="aiNotice">এই customer-এর NID, Income Declaration ও প্রয়োজনীয় তথ্য Gemini API-তে যাবে। অস্পষ্ট তথ্য বা অজানা Risk উত্তর অনুমান করে বসানো হবে না।</p>
    {message&&<p role="status">{message}</p>}
  </section>;
}
