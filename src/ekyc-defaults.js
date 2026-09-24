// Operator-selected workflow defaults, never customer risk declarations.
export const workflowDefaults={onboarding:'By Direct Sales agent (Risk-2)',product:'Savings account'};
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
