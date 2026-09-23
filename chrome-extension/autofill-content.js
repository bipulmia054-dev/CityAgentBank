// Isolated-world content script. No network, credentials, storage or page messages.
(() => {
  if(location.origin!=='https://dob-ab.citybankplc.com'||window.top!==window)return;
  let plan=null, paused=true, busy=false, done=new Set(), status='Stopped', step='', timer;
  let edited=new WeakSet();
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toUpperCase();
  document.addEventListener('input',e=>{if(e.isTrusted)edited.add(e.target);},true);
  document.addEventListener('change',e=>{if(e.isTrusted)edited.add(e.target);},true);
  const heading=()=>Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(e=>e.textContent.trim());
  const notify=message=>{status=message;};
  function stop(){paused=true;plan=null;done.clear();clearInterval(timer);notify('Stopped — customer data cleared');}
  function setValue(el,value){
    const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
    el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));
  }
  function identityConflict(current) {
    const selector=current.startsWith('Nominee')?'input#docNo':'input#nid';
    const expected=current.startsWith('Nominee')?plan.nomineeNid:plan.applicantNid;
    const input=document.querySelector(selector);
    return input?.value && expected && input.value!==expected;
  }
  async function tick(){
    if(paused||!plan||busy)return;
    busy=true;
    try {
      if(!/^\/admin\/onboarding\/?$/.test(location.pathname)){stop();notify('Manual page / final report — stopped, customer data cleared');return;}
      const heads=heading();
      let current=Object.keys(plan.steps).find(s=>heads.includes(s));
      if(!current && heads.some(h=>/fingerprint|provide customer photo|token verification|fatca/i.test(h))){notify('Manual: OTP / fingerprint / live photo / FATCA — complete yourself');return;}
      if(!current){notify('Unmapped page — manual action');return;}
      if(identityConflict(current)){paused=true;notify('STOP: NID differs from selected customer. Check bank session.');return;}
      if(current==='Nominee Information'&&document.querySelector('input#photo-0')){
        const verify=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Verify');
        if(!verify?.disabled){notify('Nominee: complete Verify manually before uploads');return;}
        current='Nominee uploads';
      }
      step=current;
      const actions=plan.steps[current];
      if(!actions.length){notify(current==='Risk Grading'?'Admin: verify and save customer-specific risk answers first':'Multiple / missing nominee — manual mapping required');return;}
      const missing=[];
      for(let i=0;i<actions.length;i++){
        if(paused||!plan)break;
        const a=actions[i],key=`${current}:${i}`;
        if(done.has(key))continue;
        if(!a.value){if(!a.optional)missing.push(a.label);continue;}
        if(a.type==='sameAddress'){
          if(missing.length)continue;
          const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Same as Present');
          const permanent=Array.from(document.querySelectorAll('input#addressLine1, input#addressLine2, select#divisionCode, select#districtCode, select#upozilaCode, input#postalCode')).filter((el,idx,all)=>Array.from(document.querySelectorAll(`[id="${el.id}"]`)).indexOf(el)===1);
          if(permanent.some(el=>edited.has(el))){missing.push('Permanent address edited manually — copy skipped');done.add(key);continue;}
          if(!b||b.disabled){missing.push(a.label);continue;} b.click();done.add(key);continue;
        }
        const nodes=document.querySelectorAll(a.selector), index=a.index||0;
        if(!nodes[index] || (nodes.length>1 && !['select#divisionCode','select#districtCode','select#upozilaCode','input#postalCode','input#addressLine1','input#addressLine2'].includes(a.selector))){missing.push(a.label+' (field unavailable/ambiguous)');continue;}
        const el=nodes[index];
        if(edited.has(el)){done.add(key);continue;}
        if(el.disabled||el.readOnly){if(norm(el.value)===norm(a.value))done.add(key);else missing.push(a.label+' (read-only)');continue;}
        if(a.type==='select'){
          const option=Array.from(el.options).find(o=>!o.disabled&&norm(o.text)===norm(a.value));
          if(!option){missing.push(a.label+' (option loading/unmapped)');continue;}
          setValue(el,option.value);
        }else if(a.type==='radio'){
          if(!el.checked)el.click();
        }else if(a.type==='file'){
          if(el.files?.length){done.add(key);continue;}
          if(!/^data:image\/jpeg;base64,/.test(a.value))throw new Error('Invalid prepared JPEG');
          const binary=atob(a.value.split(',')[1]);
          if(binary.length>=200000)throw new Error(a.label+' exceeds 200 KB');
          const file=new File([Uint8Array.from(binary,c=>c.charCodeAt(0))],a.filename,{type:'image/jpeg'});
          const transfer=new DataTransfer();transfer.items.add(file);el.files=transfer.files;
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }else if(a.type==='text'){
          setValue(el,a.value);
        }
        done.add(key);
      }
      notify(missing.length?`${current}: প্রয়োজন / check — ${[...new Set(missing)].join(', ')}`:`${current}: filled. Review ${current==='Nominee Information'?'and click Verify manually':'before Next (manual)'}.`);
    }catch(error){paused=true;notify('Paused: '+error.message);}finally{busy=false;}
  }
  chrome.runtime.onMessage.addListener((message,sender,respond)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(message.type==='CITY_AUTOFILL_START'){
      if(!message.plan?.applicantNid){respond({error:'Missing applicant NID'});return;}
      stop();plan=message.plan;edited=new WeakSet();paused=false;done=new Set();timer=setInterval(tick,650);notify('Started');tick();respond({ok:true});
    }else if(message.type==='CITY_AUTOFILL_STOP'){stop();respond({ok:true});}
    else if(message.type==='CITY_AUTOFILL_PAUSE'){paused=true;notify('Paused');respond({ok:true});}
    else if(message.type==='CITY_AUTOFILL_RESUME'){if(plan){paused=false;tick();}respond({ok:!!plan});}
    else if(message.type==='CITY_AUTOFILL_STATUS')respond({status,step,paused,serial:plan?.serial||'',active:!!plan});
  });
  window.addEventListener('pagehide',stop);
})();
