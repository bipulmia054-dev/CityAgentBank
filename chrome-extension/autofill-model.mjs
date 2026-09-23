import {casePeople} from './model.mjs';
import {relations} from '../src/ekyc-options.js';
export const BANK_ORIGIN='https://dob-ab.citybankplc.com';
export function dateText(value) {
  let s=String(value||'').trim().replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c));
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  let m=s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if(m) s=`${m[1]}/${months.indexOf(m[2].slice(0,3).toLowerCase())+1}/${m[3]}`;
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) s=`${m[3]}/${m[2]}/${m[1]}`;
  m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if(!m) return '';
  const [d,mo,y]=m.slice(1).map(Number), dt=new Date(Date.UTC(y,mo-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return '';
  return `${String(d).padStart(2,'0')}/${String(mo).padStart(2,'0')}/${y}`;
}
const english=v=>/[\u0980-\u09ff]/.test(String(v||''))?'':String(v||'').trim().toUpperCase();
const name=v=>english(v).replace(/:/g,'');
export function makePlan(caseData, assets={}, serial='') {
  const {applicant:a,nominees}=casePeople(caseData), n=nominees[0]||{}, e=caseData.ekyc||{};
  const text=(selector,value,label,index=0,optional=false)=>({selector,value:String(value??''),label,index,optional,type:'text'});
  const select=(selector,value,label,index=0)=>({...text(selector,value,label,index),type:'select'});
  const file=(selector,key,label)=>({selector,value:assets[key]||'',label,type:'file',filename:`${name(a.name).replace(/[^A-Z0-9]+/g,'_')}_${key}.jpg`});
  const address=(prefix,index)=>[
    select('select#divisionCode',e[prefix+'division'],'Division',index),select('select#districtCode',e[prefix+'district'],'District',index),select('select#upozilaCode',e[prefix+'thana'],'Thana',index),
    text('input#postalCode',e[prefix+'postalCode'],'Postcode',index),text('input#addressLine1',english(e[prefix+'addressLine1']),'Address line 1',index),text('input#addressLine2',english(e[prefix+'addressLine2']),'Address line 2',index,true)];
  const personal=[select('select#title','N/A','Title'),text('input#fatherName',name(a.fatherNameEn),'Father name'),text('input#motherName',name(a.motherNameEn),'Mother name'),select('select#gender',a.gender==='M'?'Male':a.gender==='F'?'Female':'','Gender'),text('input#email',caseData.details?.email??a.email,'Email',0,true),select('select#religion',e.religion,'Religion'),select('select#profession',e.profession,'Profession'),select('select#sectorCode',e.sector,'Sector'),select('select#education',e.education,'Education'),text('input#monthlyIncome',e.monthlyIncome||caseData.declaration?.monthlyIncome,'Monthly income'),select('select#maritalStatus',e.maritalStatus,'Marital status')];
  // Spouse input was shown in the bank guide, but must exist before use.
  if(e.maritalStatus==='MARRIED')personal.push(text('input#spouseName',name(e.spouseName),'Spouse name'));
  personal.push(...address('',0));
  if(e.sameAddress==='Yes') personal.push({type:'sameAddress',label:'Same as Present',value:'Yes'});
  else if(e.sameAddress==='No')personal.push(...address('permanent_',1));
  else personal.push({type:'missing',label:'Confirm Present/Permanent address relationship',value:''});
  return {serial,applicantNid:String(a.nid||''),nomineeNid:String(n.nid||''),steps:{
    'Upload NID':[file('input[type="file"][id^="nidFront-"]','NID_FRONT','Applicant NID front'),file('input[type="file"][id^="nidBack-"]','NID_BACK','Applicant NID back'),text('input[placeholder="DD/MM/YYYY"]',dateText(a.issueDate||a.issue_date),'Issue date'),select('select#name',e.issuePlace||english(a.issuePlaceEn||a.issuePlace),'Issue place')],
    'Dedupe And SDN Check':[text('input#name',name(a.name),'Applicant name'),text('input#nid',a.nid,'NID'),text('input[placeholder="DD/MM/YYYY"]',dateText(a.dob),'DOB')],
    'Personal Information':personal,
    'Nominee Information':nominees.length!==1?[]:[text('input[placeholder="DD/MM/YYYY"], input#dob',dateText(n.dob),'Nominee DOB'),text('input#docNo',n.nid,'Nominee NID'),text('input#name',name(n.name),'Nominee name')],
    'Nominee uploads':nominees.length!==1?[]:[file('input[type="file"]#photo-0','NOMINEE_PHOTO','Nominee photo'),file('input[type="file"]#docFrontImage-0','NOMINEE_NID_FRONT','Nominee NID front'),file('input[type="file"]#docBackImage-0','NOMINEE_NID_BACK','Nominee NID back'),text('input#percentage','100','Nominee share'),select('select#relation-0',relations.includes(n.relationship)?n.relationship:'','Nominee relation'),text('input#addressLine1',english(n.ekycAddressLine1),'Nominee address 1'),text('input#addressLine2',english(n.ekycAddressLine2),'Nominee address 2',0,true)],
    'Provide Customer Signature':[file('input[type="file"][id^="signature-"]','SIGNATURE_CARD','Admin uploaded Signature Card')],
    'Risk Grading':e.confirmed!==true?[]:[select('select#onBoardingValue',e.onboarding,'Onboarding'),select('select#geoRiskClient',e.residence,'Residence'),select('select#highOfficial',e.pep,'PEP'),select('select#closeHighOfficial',e.pepRelated,'PEP related'),select('select#isClientIp',e.ip,'IP'),select('select#productTypes',e.product,'Product'),{type:'radio',selector:'input#profession',value:e.occupation?'true':'',label:'Profession category'},select('select#professionName',e.occupation,'Occupation'),select('select#yearlyTransaction',e.transactions,'Yearly transactions'),select('select#hasSourceOfFunds',e.sourceCredible,'Credible source of funds')],
    'Additional File Upload':[file('input[type="file"][id^="sourceOfFundDoc-"]','INCOME_DECLARATION','Admin uploaded Income Declaration')]
  }};
}
