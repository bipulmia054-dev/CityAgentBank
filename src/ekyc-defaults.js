// Operator-selected editable draft values; these are not verification results.
export function bankEnglish(value){
  let text=String(value??'').trim().replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c)));
  const places={'খুলনা':'KHULNA','মেহেরপুর':'MEHERPUR','মেহেরপুর সদর':'MEHERPUR SADAR','আমঝুপী':'AMJHUPI','আমঝুপি':'AMJHUPI'};
  text=places[text]||text;
  return /[\u0980-\u09ff]/.test(text)?'':text.toUpperCase();
}
export function structuredAddress(person={}){
  const village=bankEnglish(person.village),postOffice=bankEnglish(person.postOffice);
  let code=bankEnglish(person.postalCode||person.postCode);
  const thana=bankEnglish(person.thana),district=bankEnglish(person.district);
  const full=bankEnglish(person.addressEn);
  // Full-address-only records need a fallback as OCR component fields may be blank.
  const parts=full.split(/[,\n]+/).map(v=>v.trim()).filter(Boolean);
  const codes=[...full.matchAll(/(?:^|[,\s-])(\d{4})(?=\s*(?:,|$))/g)].map(m=>m[1]);
  if(!code&&new Set(codes).size===1)code=codes[0];
  const tail=[thana,district].filter(Boolean);
  const local=parts.filter(part=>!tail.includes(part)&&part!==tail.join(' ')&&part!==code).map(part=>{
    if(code&&part.endsWith(code))return part.slice(0,-code.length).replace(/[\s-]+$/,'');
    return part;
  }).filter(Boolean).join(', ');
  const base=village&&(!person.postOffice||postOffice)?[village,postOffice].filter(Boolean).join(', '):local;
  const line1=base+(base&&code&&/^\d{4}$/.test(code)?' - '+code:'');
  return {addressLine1:line1,addressLine2:[thana,district].filter(Boolean).join(', '),postalCode:/^\d{4}$/.test(code)?code:''};
}
export const workflowDefaults={religion:'ISLAM',education:'S.S.C',maritalStatus:'SINGLE',sameAddress:'Yes',onboarding:'By Direct Sales agent (Risk-2)',product:'Savings account',residence:'Resident Bangladeshi(Risk-1)',pep:'No',pepRelated:'No',ip:'No',transactions:'From BDT 1 million to 5 million (50 Lac)(Risk 2)',sourceCredible:'YES(Risk-1)'};
export function nomineeAddress(person={}){
  const structured=structuredAddress(person);
  if(structured.addressLine1&&structured.addressLine2)return {ekycAddressLine1:structured.addressLine1,ekycAddressLine2:structured.addressLine2};
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
    for(const key of ['division','district','thana','postalCode','addressLine1','addressLine2']){
      const value=bankEnglish(next[prefix+key]);
      if(value&&value!==next[prefix+key])next={...next,[prefix+key]:value};
    }
    const thana=normal(next[prefix+'thana']);
    if(['MEHERPUR SADAR','মেহেরপুর সদর'].includes(thana))put(prefix+'district','MEHERPUR');
    if(['MEHERPUR','মেহেরপুর'].includes(normal(next[prefix+'district'])))put(prefix+'division','KHULNA');
  }
  return next;
}
