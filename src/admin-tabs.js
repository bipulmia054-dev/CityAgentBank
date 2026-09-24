export const applicationMatches = (item, tab) => tab === "all" || (tab === "pending"
  ? ["submitted", "resubmitted", "correction_required", "data_approved"].includes(item.workflow_status)
  : item.workflow_status === tab);
const searchText=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/\s+/g,' ').trim();
export function applicationSearchMatches(item,query){
  const haystack=searchText([item.serial,item.customer_number,item.name,item.name_bn,item.phone,item.email,item.worker_name,item.worker_phone,item.created_by].filter(v=>v!=null).join(' '));
  return searchText(query).split(' ').filter(Boolean).every(word=>haystack.includes(word));
}
