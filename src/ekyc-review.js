import schema from '../ekyc_ai_schema.json' with {type:'json'};
import {dateText} from '../chrome-extension/autofill-model.mjs';
export const readPath=(value,path)=>path.split('.').reduce((v,k)=>v?.[k],value)??'';
export function reviewFields(data){
  return schema.flatMap(f=>f.scope==='person'?(data.people||[]).flatMap((p,i)=>i===0&&['relationship','ekycAddressLine1','ekycAddressLine2'].includes(f.key)?[]:[{...f,path:`people.${i}.${f.key}`,label:`${i?`Nominee ${i}`:'Applicant'} · ${f.label}`}]):[{...f,path:`${f.scope}.${f.key}`,label:f.label.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase())}]);
}
export function writePath(data,path,value){
  const keys=path.split('.');
  const write=(current,index)=>{const key=keys[index];const copy=Array.isArray(current)?[...current]:{...current};copy[key]=index===keys.length-1?value:write(current?.[key],index+1);return copy;};
  return write(data,0);
}
export function applyProposals(data,proposals,selected){
  let next=data;const fields=new Map(reviewFields(data).map(f=>[f.path,f]));const locks=new Set(data.aiReview?.locks||[]);
  for(const p of proposals){
    const f=fields.get(p.path);
    if(!selected.includes(p.path)||!f||f.humanOnly||locks.has(p.path)||String(readPath(data,p.path))!==String(p.before??'')||!p.value||(f.options&&!f.options.includes(p.value)))continue;
    next=writePath(next,p.path,p.value);
    if(p.path==='people.0.name')next={...next,name:p.value};
    if(p.path==='details.email')next=writePath(next,'people.0.email',p.value);
  }
  return next===data?data:{...next,ekyc:{...next.ekyc,confirmed:false}};
}
export function undoChanges(data,entry){
  let next=data;const allowed=new Set(reviewFields(data).map(f=>f.path));const locks=new Set(data.aiReview?.locks||[]);
  for(const c of entry.changes||[]){if(allowed.has(c.path)&&!locks.has(c.path)&&String(readPath(data,c.path))===String(c.after??'')){
    next=writePath(next,c.path,c.before??'');
    if(c.path==='people.0.name')next={...next,name:c.before??''};
    if(c.path==='details.email')next=writePath(next,'people.0.email',c.before??'');
  }}
  return next===data?data:{...next,ekyc:{...next.ekyc,confirmed:false}};
}
export function remainingItems(data,assets={}){
  const missing=[];const labels=new Map(reviewFields(data).map(f=>[f.path,f.label]));const check=(path,label)=>{if(!String(readPath(data,path)).trim())missing.push(label);};
  if(!(data.people||[]).length)missing.push('Applicant তথ্য নেই');
  (data.people||[]).forEach((p,i)=>{
    const label=i?`Nominee ${i}`:'Applicant';
    for(const key of ['name','nid','dob','idFront','idBack','photo'])check(`people.${i}.${key}`,`${label}: ${key}`);
    if(p.nid&&!/^(\d{10}|\d{13}|\d{17})$/.test(p.nid))missing.push(`${label}: NID-এর সংখ্যা যাচাই করুন`);
    if(p.dob&&!dateText(p.dob))missing.push(`${label}: DOB সঠিক নয়`);
    if(i){check(`people.${i}.relationship`,`${label}: Relation`);check(`people.${i}.ekycAddressLine1`,`${label}: Address`);}
  });
  for(const key of ['fatherNameEn','motherNameEn','gender','issueDate'])check(`people.0.${key}`,`Applicant: ${key}`);
  for(const key of ['issuePlace','religion','education','maritalStatus','profession','sector','monthlyIncome','division','district','thana','postalCode','addressLine1','sameAddress','onboarding','residence','pep','pepRelated','ip','product','occupation','transactions','sourceCredible'])check(`ekyc.${key}`,`eKYC: ${key}`);
  if(data.ekyc?.maritalStatus==='MARRIED')check('ekyc.spouseName','Spouse Name');
  if(data.ekyc?.sameAddress==='No')for(const k of ['division','district','thana','postalCode','addressLine1'])check(`ekyc.permanent_${k}`,`Permanent: ${k}`);
  for(const f of reviewFields(data)){const v=readPath(data,f.path);if(v&&f.options&&!f.options.includes(v))missing.push(`${f.label}: dropdown-এর সঙ্গে মিল নেই`);}
  if(data.ekyc?.monthlyIncome&&(!Number.isFinite(Number(data.ekyc.monthlyIncome))||Number(data.ekyc.monthlyIncome)<=0))missing.push('Monthly Income সঠিক নয়');
  if(data.ekyc?.postalCode&&!/^\d{4}$/.test(data.ekyc.postalCode))missing.push('Postal Code চারটি English digit হতে হবে');
  if(data.people?.[0]?.issueDate&&!dateText(data.people[0].issueDate))missing.push('NID Issue Date সঠিক নয়');
  if((data.people||[]).length!==2)missing.push('একাধিক/অনুপস্থিত Nominee: ব্যাংকের mapping manual review প্রয়োজন');
  if(data.ekyc?.profession==='Businessmen/Industrialist')missing.push('Business Risk dropdown live mapping / manual review বাকি');
  if(!(data.docs||[]).some(d=>d.kind==='signature_card'&&d.pages?.length===1))missing.push('Admin uploaded Signature Card');
  if(assets.income!==true)missing.push(assets.income===false?'Admin uploaded Income Declaration':'Income Declaration upload যাচাই বাকি');
  return [...new Set(missing.map(item=>item.startsWith('eKYC: ')?`eKYC: ${labels.get('ekyc.'+item.slice(6))||item.slice(6)}`:item))];
}
