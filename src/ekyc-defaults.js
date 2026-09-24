// Operator-selected editable draft values; these are not verification results.
export const workflowDefaults={religion:'ISLAM',education:'S.S.C',maritalStatus:'SINGLE',sameAddress:'Yes',onboarding:'By Direct Sales agent (Risk-2)',product:'Savings account',residence:'Resident Bangladeshi(Risk-1)',pep:'No',pepRelated:'No',ip:'No',transactions:'From BDT 1 million to 5 million (50 Lac)(Risk 2)',sourceCredible:'YES(Risk-1)'};
export function nomineeAddress(person={}){
  const full=String(person.addressEn||'').trim();
  if(!full||/[\u0980-\u09ff]/.test(full))return {};
  // Preserve the full text; split only on an existing separator, not guessed geography.
  const parts=full.split(/[,\n]+/).map(v=>v.trim()).filter(Boolean);
  const split=parts.length>=3?parts.length-2:1;
  return {ekycAddressLine1:parts.slice(0,split).join(', ').toUpperCase(),ekycAddressLine2:parts.slice(split).join(', ').toUpperCase()};
}
export function completeAddressParents(ekyc={}){
  let next=ekyc;
  const put=(key,value)=>{if(!String(next[key]||'').trim())next={...next,[key]:value};};
  const normal=value=>String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
  for(const prefix of ['', 'permanent_']){
    const thana=normal(next[prefix+'thana']);
    if(['MEHERPUR SADAR','মেহেরপুর সদর'].includes(thana))put(prefix+'district','MEHERPUR');
    if(['MEHERPUR','মেহেরপুর'].includes(normal(next[prefix+'district'])))put(prefix+'division','KHULNA');
  }
  return next;
}
