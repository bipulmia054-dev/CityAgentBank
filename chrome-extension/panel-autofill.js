import {makePlan,BANK_ORIGIN} from './autofill-model.mjs';
import {casePeople,safeImage} from './model.mjs';
let target=null,generation=0;
const $=id=>document.getElementById(id);
export async function haltAutofill(){
  generation++;
  const old=target;target=null;
  if(old!==null)await chrome.tabs.sendMessage(old,{type:'CITY_AUTOFILL_STOP'}).catch(()=>{});
  if($('autofill-status'))$('autofill-status').textContent='Stopped';
}
const dataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
export function setupAutofill({getSelected,api,compress,stamp}){
  $('autofill-start').onclick=async()=>{
    await haltAutofill();const token=generation,row=getSelected();
    if(!row)return;
    $('autofill-start').disabled=true;
    try {
      if(!confirm(`${row.serial} — ${row.name}\nএই customer-এর যাচাই করা তথ্য ও documents শুধু ${BANK_ORIGIN}-এর বর্তমান onboarding-এ পাঠাবেন? ব্যাংকের mobile/OTP একই customer-এর নিশ্চিত করুন। Existing mapped fields পূরণ হবে; এরপর manual edits রাখা হবে। Next/Verify/final submit manual।`))return;
      const tabs=await chrome.tabs.query({url:BANK_ORIGIN+'/admin/onboarding*'});
      const active=tabs.filter(t=>t.active),tab=active.length===1?active[0]:tabs.length===1?tabs[0]:null;
      if(!tab)throw new Error('একটি bank onboarding tab খুলে active করুন।');
      if(new URL(tab.url).pathname.replace(/\/$/,'')!=='/admin/onboarding')throw new Error('Account report নয়—নতুন onboarding-এর mapped page খুলুন।');
      $('autofill-status').textContent='Latest saved customer ও admin-uploaded documents প্রস্তুত হচ্ছে…';
      const [detail,signature,income]=await Promise.all([api(`/api/customers/${row.id}/extension`),api(`/api/customers/${row.id}/signature-card`),api(`/api/customers/${row.id}/income-declaration-card`)]);
      const {applicant:a,nominees}=casePeople(detail.case||{}),n=nominees[0]||{};
      const onePage=result=>{const pages=(result.documents||[]).flatMap(d=>d.pages||[]);return pages.length===1?pages[0]:'';};
      const source={NID_FRONT:a.idFront,NID_BACK:a.idBack,NOMINEE_PHOTO:n.photo,NOMINEE_NID_FRONT:n.idFront,NOMINEE_NID_BACK:n.idBack,SIGNATURE_CARD:onePage(signature),INCOME_DECLARATION:onePage(income)};
      const assets={};
      for(const [key,image] of Object.entries(source)){
        if(token!==generation)return;
        if(safeImage(image))assets[key]=await dataUrl(await (key.includes('NID_')?stamp(image):compress(image,199999)));
      }
      const latest=await api(`/api/customers/${row.id}/revision`);
      if(detail.revision!==undefined&&latest.revision!==detail.revision)throw new Error('Customer পরিবর্তিত হয়েছে। Start আবার চাপুন।');
      if(token!==generation||getSelected()?.id!==row.id)return;
      const plan=makePlan(detail.case||{},assets,row.serial);
      const result=await chrome.tabs.sendMessage(tab.id,{type:'CITY_AUTOFILL_START',plan});
      if(result?.error)throw new Error(result.error);
      target=tab.id;
      if(token!==generation){await haltAutofill();return;}
      $('autofill-status').textContent='Auto Fill চালু — page বদলালে নিজে চলবে।';
    }catch(error){$('autofill-status').textContent=`চালু হয়নি: ${error.message}. Extension update-এর পরে bank tab refresh প্রয়োজন হতে পারে; অসমাপ্ত form থাকলে আগে নিরাপদে শেষ করুন।`;}
    finally{$('autofill-start').disabled=false;}
  };
  for(const [id,type] of [['autofill-pause','CITY_AUTOFILL_PAUSE'],['autofill-resume','CITY_AUTOFILL_RESUME']])$(id).onclick=async()=>{if(target!==null)await chrome.tabs.sendMessage(target,{type}).catch(()=>haltAutofill());};
  $('autofill-stop').onclick=haltAutofill;
  setInterval(async()=>{
    if(target===null)return;
    try{const s=await chrome.tabs.sendMessage(target,{type:'CITY_AUTOFILL_STATUS'});$('autofill-status').textContent=`${s.serial} ${s.status}`;}catch{target=null;$('autofill-status').textContent='Tab বন্ধ/reload হয়েছে। নির্বাচিত customer যাচাই করে Start আবার চাপুন।';}
  },1000);
}
