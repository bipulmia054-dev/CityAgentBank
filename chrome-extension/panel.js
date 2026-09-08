import {readJson} from '../src/api-response.js';
import {declarationCanvas, declarationPdf} from '../src/declaration.js';
import { DEFAULT_SERVER, casePeople, safeImage } from './model.mjs';
const $ = id => document.getElementById(id);
const server = DEFAULT_SERVER;
let selected = null, requestVersion = 0, selectedCase = null, selectedRevision = null, declarationDirty = false, lastSeenRevision = null;
const blobs = new Set();
function notice(message = '', error = false) { $('notice').textContent = message; $('notice').className = error ? 'error' : ''; }
function clearRecords() { requestVersion++; selected = null; selectedCase = null; declarationDirty = false; $('results').replaceChildren(); $('record-content').replaceChildren(); $('record').hidden = true; $('results').hidden = false; }
function unauthenticated() { clearRecords(); $('workspace').hidden = true; $('login').hidden = false; }
async function api(path, options = {}) {
  const response = await fetch(server + path, { ...options, credentials: 'include', cache: 'no-store', redirect: 'error', signal: options.signal || AbortSignal.timeout(90000), headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (response.status === 401) { unauthenticated(); notice('Login করুন। Session শেষ হয়ে থাকতে পারে।', true); throw new Error('Login করুন। Session শেষ হয়ে থাকতে পারে।'); }
  const result = await readJson(response);
  if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
  return result;
}
function showError(error) { notice(error instanceof TypeError || error.name === 'TimeoutError' ? 'Server পাওয়া যাচ্ছে না। ইন্টারনেট ও citybank.abmgroup.tech server পরীক্ষা করুন।' : error.message, true); }
async function connect() {
  notice('Server-এ সংযোগ হচ্ছে…');
  try {
    const auth = await api('/api/auth/status');
    if (!auth.authenticated) { unauthenticated(); notice(auth.setupRequired ? 'আগে মূল software-এ username/password তৈরি করুন।' : 'আগের username/password দিয়ে Login করুন।'); return; }
    if (!['admin','master_admin','subadmin'].includes(auth.role)) { unauthenticated(); notice('পূর্ণ customer file দেখতে Admin account দিয়ে Login করুন।', true); return; }
    $('login').hidden = true; $('workspace').hidden = false; $('user').textContent = auth.username; notice();
    await search();
  } catch (error) { unauthenticated(); showError(error); }
}
async function search() {
  clearRecords(); const version = requestVersion;
  $('search-button').disabled = true; notice('Customer খোঁজা হচ্ছে…');
  try {
    const result = await api('/api/customers?q=' + encodeURIComponent($('query').value.trim()));
    if (version !== requestVersion) return;
    const rows = Array.isArray(result.customers) ? result.customers : [];
    notice(rows.length ? `${rows.length}টি file পাওয়া গেছে${rows.length === 100 ? '—আরও নির্দিষ্ট করে search করুন' : ''}` : 'কোনো Save করা customer পাওয়া যায়নি।');
    for (const row of rows) {
      const button = document.createElement('button'); button.className = 'result';
      const name = document.createElement('strong'); name.textContent = row.name || row.name_bn || 'Customer';
      const meta = document.createElement('small'); meta.textContent = [row.serial, row.phone, row.customer_number].filter(Boolean).join(' • ');
      const email = document.createElement('small'); email.textContent = row.email || '';
      button.append(name, meta, email); button.addEventListener('click', () => openRecord(row)); $('results').append(button);
    }
  } catch (error) { if (version === requestVersion) showError(error); }
  finally { $('search-button').disabled = false; }
}
function fields(container, values) {
  const list = document.createElement('dl');
  for (const [label, value] of values) {
    const copyValue = /date|dob|birth|issue|expiry/i.test(label) ? ddmmyyyy(value) : value;
    const field = document.createElement('div'); field.className = 'field';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'), text = document.createElement('span'); text.textContent = copyValue || 'দেওয়া নেই'; if (!copyValue) text.className = 'missing'; dd.append(text);
    if (copyValue) { const copy = document.createElement('button'); copy.className = 'copy'; copy.textContent = 'Copy'; copy.setAttribute('aria-label', label + ' copy'); copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(copyValue); copy.textContent = '✓'; setTimeout(() => copy.textContent = 'Copy', 1000); } catch { notice('Copy হয়নি—লেখাটি select করে Ctrl+C করুন।', true); } }); dd.append(copy); }
    field.append(dt, dd); list.append(field);
  }
  container.append(list);
}
function ddmmyyyy(value) {
  const text = String(value || '').trim().replace(/[০-৯]/g, digit => '০১২৩৪৫৬৭৮৯'.indexOf(digit));
  const named = text.match(/(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})/i);
  if (named) { const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12}; return `${named[1].padStart(2,'0')}/${String(months[named[2].slice(0,3).toLowerCase()]).padStart(2,'0')}/${named[3]}`; }
  const iso = text.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D.*)?$/);
  if (iso) return `${iso[3].padStart(2,'0')}/${iso[2].padStart(2,'0')}/${iso[1]}`;
  const slash = text.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
  return slash ? `${slash[1].padStart(2,'0')}/${slash[2].padStart(2,'0')}/${slash[3]}` : text;
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob); blobs.add(url);
  const link = document.createElement('a'); link.href=url; link.download=name.replace(/[\\/:*?"<>|]/g,'_'); link.click();
  setTimeout(()=>{URL.revokeObjectURL(url);blobs.delete(url);},60000);
}
async function compressedJpeg(source, maximumBytes = 200 * 1024) {
  const image = await new Promise((resolve, reject) => { const item = new Image(); item.onload=()=>resolve(item); item.onerror=reject; item.src=source; });
  let width=Math.min(image.naturalWidth,1800), height=Math.round(image.naturalHeight*width/image.naturalWidth), quality=.86;
  while (width >= 160) {
    const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    canvas.getContext('2d').drawImage(image,0,0,width,height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    if(blob && blob.size<=maximumBytes)return blob;
    if(quality>.45) quality-=.12; else { width=Math.round(width*.78); height=Math.round(height*.78); quality=.82; }
  }
  throw new Error('ছবিটি 200 KB-এর নিচে compress করা যায়নি');
}
async function downloadImage(source, name) { downloadBlob(await compressedJpeg(source),`${name}.jpg`); }
function photo(container, source, label) {
  const src = safeImage(source); if (!src) return;
  const figure=document.createElement('figure');
  const image = document.createElement('img'); image.src=src; image.alt=label; image.className='photo'; image.loading='lazy';
  const download=document.createElement('button');download.textContent=label+' Download (≤200 KB)';
  download.addEventListener('click',async()=>{download.disabled=true;try{await downloadImage(src,`${selected?.serial||'Customer'}_${label}`);}catch(error){showError(error);}finally{download.disabled=false;}});
  const personIndex=selectedCase?.people?.findIndex(person=>person.photo===source) ?? -1;
  if(personIndex>=0 && label.includes('Photo')) {
    const process=document.createElement('button');process.textContent='AI দিয়ে ছবি তৈরি করুন';
    const remake=async(extraPrompt='')=>{
      const record=selected, revision=selectedRevision, originalCase=selectedCase;
      process.disabled=true; notice('ছবি তৈরি হচ্ছে…');
      try {
        const result=await api('/api/passport-photo',{method:'POST',body:JSON.stringify({image:source,extraPrompt}),signal:AbortSignal.timeout(300000)});
        if(selected?.id!==record.id)return;
        const preview=document.createElement('img');preview.src=safeImage(result.image);preview.className='photo';preview.alt='AI photo preview';
        const previewDownload=document.createElement('button');previewDownload.textContent='AI Photo Download (≤200 KB)';previewDownload.onclick=()=>downloadImage(preview.src,`${record.serial}_${label}_AI`);
        const save=document.createElement('button');save.textContent='এই ছবি সেভ করুন';
        const discard=document.createElement('button');discard.textContent='বাদ দিন';
        const again=document.createElement('button');again.textContent='Prompt দিয়ে আবার তৈরি করুন';
        discard.onclick=()=>{preview.remove();previewDownload.remove();save.remove();discard.remove();again.remove();process.disabled=false;};
        again.onclick=()=>{const note=prompt('নতুন ছবির জন্য extra instruction লিখুন (optional)'); if(note!==null) remake(note);};
        save.onclick=async()=>{save.disabled=true;try{
          if(selected?.id!==record.id) return;
          const updated={...originalCase,people:originalCase.people.map((p,i)=>i===personIndex?{...p,photo:result.image}:p)};
          await api('/api/admin/customers/'+record.id,{method:'PUT',body:JSON.stringify({case:updated,revision})});
          notice('ছবি সেভ হয়েছে।');await openRecord(record);
        }catch(error){showError(error);save.disabled=false;}};
        figure.append(preview,previewDownload,save,again,discard);notice('ছবি যাচাই করে Download বা Save করুন।');
      } catch(error){showError(error);process.disabled=false;}
    };
    process.addEventListener('click',()=>remake());
    figure.append(process);
  }
  figure.append(image,download);container.append(figure);
}
function personCard(label, person, fallback = {}, nominee = false) {
  const card=document.createElement('section');card.className='person';const title=document.createElement('h3');title.textContent=label;card.append(title);
  photo(card,person.photo,`${label} Photo`);
  const ids=document.createElement('div');ids.className='identityPair';
  photo(ids,person.idFront,`${label} ID Front`); photo(ids,person.idBack,`${label} ID Back`); card.append(ids);
  if(nominee) {
    fields(card,[["Relationship with applicant",person.relation||person.relationship||person.relationToApplicant||""],["Full address",String(person.addressEn||person.addressBn||"").toUpperCase()]]);
  } else {
    fields(card,[["Issue date",person.issueDate||person.issue_date||""],["Issue place",person.issuePlace||person.issue_place||""],["Applicant name",person.name||person.nameBn||fallback.name||""],["Applicant NID number",person.nid||fallback.customer_number||""],["Date of birth",person.dob||""],["Father's name",person.fatherNameEn||person.fatherNameBn||""],["Mother's name",person.motherNameEn||person.motherNameBn||""],["Phone number",person.phone||fallback.phone||""],["Email ID",person.email||fallback.email||""],["Address",person.addressEn||person.addressBn||""]]);
  }
  $('record-content').append(card);
}
async function signatureCards() {
  if(!selected)return;
  let section=document.getElementById('signature-cards');
  if(!section){section=document.createElement('section');section.id='signature-cards';$('record-content').append(section);}
  section.replaceChildren();const title=document.createElement('h3');title.textContent='Signature Card';section.append(title);
  const id=selected.id;const loading=document.createElement('p');loading.textContent='Loading signature card…';section.append(loading);const result=await api(`/api/customers/${id}/signature-card`);
  if(selected?.id!==id)return;
  section.replaceChildren(title);
  if(!result.documents?.length){const p=document.createElement('p');p.textContent='Admin card upload করলে এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে।';const reload=document.createElement('button');reload.textContent='Signature Card Reload';reload.addEventListener('click',async()=>{reload.disabled=true;try{await signatureCards();}catch(error){showError(error);}finally{reload.disabled=false;}});section.append(p,reload);}
  for(const doc of result.documents||[])for(const [i,page] of (doc.pages||[]).entries())photo(section,page,`Signature Card ${i+1}`);
}
function declarationCard(caseData) {
  const card=document.createElement('section');card.className='declaration';const title=document.createElement('h3');title.textContent='আয়ের ঘোষণাপত্র';card.append(title);
  const values={...caseData.declaration};const form=document.createElement('div');
  const labels={customerName:'গ্রাহকের নাম',fatherName:'পিতার নাম',motherName:'মাতার নাম',address:'পাড়া / গ্রাম',postOffice:'ডাকঘর',postCode:'পোস্ট কোড',thana:'থানা',district:'জেলা',monthlyIncome:'মাসিক আয়',accountNumber:'হিসাব নম্বর',rawDescription:'মূল বক্তব্য',polishedDescription:'সাজানো বিবরণ'};
  const inputs={};
  for(const [key,label] of Object.entries(labels)) {const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement(key.includes('Description')?'textarea':'input');input.value=values[key]||'';input.addEventListener('input',()=>{values[key]=input.value;declarationDirty=true;});inputs[key]=input;wrapper.append(input);form.append(wrapper);}
  const preview=document.createElement('img');preview.className='pdfPreview';preview.alt='Income declaration PDF preview';
  const controls=document.createElement('div');controls.className='actions';
  const recreate=document.createElement('button');recreate.textContent='AI দিয়ে আবার তৈরি করুন';
  const save=document.createElement('button');save.textContent='PDF Save ও Download করুন';
  const existing=document.createElement('button');existing.textContent='সেভ করা PDF Download';existing.className='quiet';
  const jpg=document.createElement('button');jpg.textContent='JPG Download (≤200 KB)';
  const message=document.createElement('p');message.setAttribute('role','status');
  const id=selected.id;
  let revision=selectedRevision;
  const applicant=casePeople(caseData).applicant;
  const signature=caseData.docs?.find(d=>d.kind==='signature')?.pages?.[0];
  const render=async()=>{const canvas=await declarationCanvas(applicant,values,signature,'income-declaration-page1.png');preview.src=canvas.toDataURL('image/jpeg',.85);};
  recreate.addEventListener('click',async()=>{recreate.disabled=true;save.disabled=true;message.textContent='AI দিয়ে Description তৈরি হচ্ছে…';try{const result=await api('/api/gemini-description',{method:'POST',body:JSON.stringify({text:values.rawDescription||values.polishedDescription,name:values.customerName||applicant.nameBn||applicant.name,profession:applicant.profession||'',monthlyIncome:values.monthlyIncome})});values.polishedDescription=result.text;inputs.polishedDescription.value=result.text;declarationDirty=true;await render();message.textContent='Review করে Save & Download চাপুন।';}catch(error){message.textContent=error.message;}finally{recreate.disabled=false;save.disabled=false;}});
  save.addEventListener('click',async()=>{save.disabled=true;recreate.disabled=true;message.textContent='PDF তৈরি ও Save হচ্ছে…';try{await render();const pdf=await declarationPdf(applicant,values,signature,'income-declaration-page1.png');const encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(pdf);});const result=await api(`/api/customers/${id}/declaration`,{method:'POST',body:JSON.stringify({declaration:values,pdf:encoded,revision})});revision=result.revision;if(selected?.id===id){selectedRevision=result.revision;lastSeenRevision=result.revision;declarationDirty=false;}downloadBlob(pdf,`${id}_Income_Declaration.pdf`);message.textContent='PDF Save হয়েছে।';}catch(error){message.textContent=error.message;}finally{save.disabled=false;recreate.disabled=false;}});
  existing.addEventListener('click',async()=>{try{const response=await fetch(`${server}/api/customers/${id}/declaration`,{credentials:'include',cache:'no-store',redirect:'error'});if(!response.ok)throw new Error('Saved PDF পাওয়া যায়নি। Details থেকে PDF তৈরি করুন।');downloadBlob(await response.blob(),`${id}_Income_Declaration.pdf`);}catch(error){message.textContent=error.message;}});
  jpg.addEventListener('click',async()=>{try{if(!preview.src)await render();await downloadImage(preview.src,`${selected?.serial||id}_Income_Declaration`);}catch(error){message.textContent=error.message;}});
  controls.append(recreate,save,jpg,existing);card.append(preview,form,controls,message);$('record-content').append(card);
  setTimeout(()=>render().catch(error=>{message.textContent=error.message;}),0);
}
async function openRecord(row) {
  const version = ++requestVersion; selected = row; $('record-content').replaceChildren(); $('results').hidden = true; $('record').hidden = false;
  $('record-title').textContent = row.name || row.name_bn || 'Customer'; $('serial').textContent = row.serial || ''; notice('Details আসছে…');
  let caseData = {}, data = {};
  try { data = await api(`/api/customers/${encodeURIComponent(row.id)}/extension`); if (version !== requestVersion) return; caseData = data.case || {}; selectedCase=caseData; selectedRevision=data.revision; lastSeenRevision=data.revision; declarationDirty=false; notice(); }
  catch (error) { if (version !== requestVersion) return; if ($('workspace').hidden) return; notice('সম্পূর্ণ details পাওয়া যায়নি। ' + error.message + ' মূল PDF download করে দেখুন।', true); return; }
  const { applicant, nominees } = casePeople(caseData);
  const summary=document.createElement('section');summary.className='caseSummary';const summaryTitle=document.createElement('h3');summaryTitle.textContent=`Case - ${row.serial||String(row.id).padStart(6,'0')}`;const collector=data.collector||{};const collectorLine=document.createElement('small');collectorLine.textContent=`Collected by: ${collector.fullName||row.created_by||'—'}${collector.phone?` • ${collector.phone}`:''}`;summary.append(summaryTitle,collectorLine);$('record-content').append(summary);
  personCard('Applicant', applicant, {...row,email:row.email||caseData.details?.email,phone:row.phone||caseData.details?.phone});
  if (nominees.length) nominees.forEach((p, i) => personCard(`Nominee ${nominees.length > 1 ? i + 1 : ''}`, p, {}, true));
  else { const missing = document.createElement('p'); missing.textContent = 'Nominee details are not available.'; $('record-content').append(missing); }
  if(version===requestVersion) signatureCards().catch(showError);
  const profession=document.createElement('section');profession.className='person';profession.innerHTML='<h3>Profession</h3>';fields(profession,[["Profession / work",applicant.profession||'']]);$('record-content').append(profession);
  declarationCard(caseData);
  const complete=document.createElement('section');complete.className='completeAccount';const completeTitle=document.createElement('h3');completeTitle.textContent='Account completion';const account=document.createElement('input');account.placeholder='City Bank account number';account.inputMode='numeric';const completeButton=document.createElement('button');completeButton.textContent='Complete account';completeButton.onclick=async()=>{try{completeButton.disabled=true;await api(`/api/admin/customers/${row.id}/review`,{method:'PUT',body:JSON.stringify({action:'complete',accountNumber:account.value})});notice('Account completed হয়েছে');}catch(error){showError(error);}finally{completeButton.disabled=false;}};complete.append(completeTitle,account,completeButton);$('record-content').append(complete);
}
let polling=false;
setInterval(async()=>{
  if(!selected || document.hidden || polling)return;
  polling=true;
  const id=selected.id;
  try{const result=await api(`/api/customers/${id}/revision`);if(selected?.id===id&&result.revision!==lastSeenRevision){await signatureCards();lastSeenRevision=result.revision;if(!declarationDirty){notice('ফাইল আপডেট হয়েছে—সর্বশেষ Signature Card দেখানো হচ্ছে। অন্য details দেখতে ফাইল আবার খুলুন।');}else{notice('Server-এ file update হয়েছে। আপনার edit রাখা আছে; Save conflict হলে নতুন file খুলুন।');}}}catch(error){showError(error);}finally{polling=false;}
},500);
$('search-form').addEventListener('submit', event => { event.preventDefault(); search(); });
$('back').addEventListener('click', () => { requestVersion++; selected = null; $('record').hidden = true; $('record-content').replaceChildren(); $('results').hidden = false; notice(); });
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('login-button').disabled = true;
  try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value }) }); $('password').value = ''; await connect(); }
  catch (error) { $('password').value = ''; showError(error); }
  finally { $('login-button').disabled = false; }
});
$('logout').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); unauthenticated(); notice('Logout হয়েছে'); } catch (error) { showError(error); } });
$('close').addEventListener('click', async () => { const current = await chrome.windows.getCurrent(); await chrome.sidePanel.close({ windowId: current.id }); });
$('open-server').addEventListener('click', () => chrome.tabs.create({ url: server + '/' }));
$('download').addEventListener('click', async () => {
  if (!selected) return;
  const row = selected; $('download').disabled = true; notice('ZIP download হচ্ছে…');
  try {
    const response = await fetch(`${server}/api/customers/${encodeURIComponent(row.id)}/download`, { credentials: 'include', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90000) });
    if (response.status === 401) { unauthenticated(); throw new Error('আবার Login করুন'); }
    if (!response.ok) throw new Error('Customer file পাওয়া যায়নি');
    const blob = await response.blob(); if (!blob.type.includes('zip') && !blob.type.includes('pdf')) throw new Error('Server download file ফেরত দেয়নি');
    const suffix=blob.type.includes('zip')?'.zip':'.pdf';
    const url = URL.createObjectURL(blob); blobs.add(url); const link = document.createElement('a'); link.href = url; link.download = (row.archive_name || `${row.name}_${row.phone}`).replace(/[\\/:*?"<>|]/g, '_').replace(/\.(zip|pdf)$/i, '')+suffix; link.click();
    setTimeout(() => { URL.revokeObjectURL(url); blobs.delete(url); }, 60000); notice('Customer file Chrome Downloads-এ পাঠানো হয়েছে');
  } catch (error) { showError(error); } finally { $('download').disabled = false; }
});
window.addEventListener('pagehide', () => { for (const url of blobs) URL.revokeObjectURL(url); });
connect();
