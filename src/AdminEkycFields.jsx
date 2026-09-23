import React from 'react';
import { relations, education, religions, professions, sectors, occupationLabels, products, onboarding, residence, transactions } from './ekyc-options.js';
function Choice({label,value,onChange,options}) {
  return <label><span>{label}</span><select value={value || ''} onChange={e=>onChange(e.target.value)}>
    <option value="">নির্বাচন করুন / অজানা</option>
    {value && !options.includes(value) && <option value={value}>{value} — মিলিয়ে নির্বাচন করুন</option>}
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select></label>;
}
function Text({label,value,onChange,type='text'}) {
  return <label><span>{label}</span><input type={type} autoComplete="off" value={value ?? ''} onChange={e=>onChange(e.target.value)}/></label>;
}
export default function AdminEkycFields({caseData,onChange}) {
  const e=caseData.ekyc || {};
  const config=(key,value)=>onChange({...caseData,ekyc:{...e,[key]:value,confirmed:false}});
  const nominee=(index,key,value)=>onChange({...caseData,ekyc:{...e,confirmed:false},people:caseData.people.map((p,i)=>i===index?{...p,[key]:value}:p)});
  const field=(key,label,type='text')=><Text key={key} label={label} type={type} value={e[key]} onChange={v=>config(key,v)}/>;
  const select=(key,label,options)=><Choice key={key} label={label} value={e[key]} options={options} onChange={v=>config(key,v)}/>;
  return <section className="reviewPerson">
    <h2>eKYC Autofill — অতিরিক্ত Customer Details</h2>
    <p>শুধু যাচাই করা তথ্য দিন। অজানা ঘর খালি রাখুন; extension অনুমান করবে না। Admin Edit Save চাপুন।</p>
    <div className="reviewFields">
      {select('religion','Religion',religions)}{select('education','Education',education)}
      {select('maritalStatus','Marital Status',['SINGLE','MARRIED'])}
      {e.maritalStatus==='MARRIED' && field('spouseName','Spouse Name (English)')}
      {select('profession','Bank Profession',professions)}{select('sector','Sector Code',sectors)}
      {field('monthlyIncome','Declared Monthly Income (BDT)','number')}{field('issuePlace','NID Issue Place (English bank district label)')}
    </div>
    <h3>Present Address (English)</h3><div className="reviewFields">
      {field('division','Division')}{field('district','District')}{field('thana','Upazila / Thana')}
      {field('postalCode','Postal Code')}{field('addressLine1','Address Line 1 — Village / Union')}{field('addressLine2','Address Line 2 — Thana / District')}
      {select('sameAddress','Permanent Address same as Present?',['Yes','No'])}
    </div>
    {e.sameAddress==='No' && <><h3>Permanent Address</h3><div className="reviewFields">{['division','district','thana','postalCode','addressLine1','addressLine2'].map(key=>field('permanent_'+key,key))}</div></>}
    {(caseData.people||[]).slice(1).map((p,i)=><section key={p.id || i}><h3>Nominee {i+1} — Relation & Address</h3><div className="reviewFields">
      <Choice label="Applicant-এর কাছে Nominee কে হন" value={p.relationship} options={relations} onChange={v=>nominee(i+1,'relationship',v)}/>
      <Text label="Nominee Address Line 1 (English)" value={p.ekycAddressLine1} onChange={v=>nominee(i+1,'ekycAddressLine1',v)}/>
      <Text label="Nominee Address Line 2 (English)" value={p.ekycAddressLine2} onChange={v=>nominee(i+1,'ekycAddressLine2',v)}/>
    </div></section>)}
    <h3>Risk Grading — গ্রাহকভিত্তিক যাচাই</h3>
    <p>বার্ষিক লেনদেন মাসিক আয় নয়। PEP/IP ও source of funds সবার জন্য একই ধরে নেওয়া হবে না। Business / multiple nominee-এর unmapped অংশ manually পূরণ করুন।</p>
    <div className="reviewFields">
      {select('onboarding','Type of Onboarding',onboarding)}{select('residence','Client residence',residence)}
      {select('pep','Client PEP / Chief / High Official?',['Yes','No'])}
      {select('pepRelated','Family / close associates related to PEP / High Official?',['Yes','No'])}
      {select('ip','Client IP / family or close associates related to IP?',['Yes','No'])}
      {select('product','Type of Product',products)}{select('occupation','Profession Risk Occupation',occupationLabels)}
      {select('transactions','Average Yearly Transactions',transactions)}{select('sourceCredible','Verified credible Source of Funds?',['YES(Risk-1)','NO(Risk-5)'])}
    </div>
    <label><input type="checkbox" checked={e.confirmed===true} onChange={ev=>onChange({...caseData,ekyc:{...e,confirmed:ev.target.checked}})}/> এই customer-এর eKYC ও risk প্রশ্নের উত্তর যাচাই করেছি।</label>
  </section>;
}
