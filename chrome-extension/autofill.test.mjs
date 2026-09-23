import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makePlan,dateText} from './autofill-model.mjs';
import {relations} from '../src/ekyc-options.js';
test('dates normalize English/Bangla and reject impossible dates',()=>{
  for(const v of ['23 Dec 1999','1999-12-23','২৩/১২/১৯৯৯'])assert.equal(dateText(v),'23/12/1999');
  for(const v of ['31/02/2000','invalid','10 abc 2020'])assert.equal(dateText(v),'');
});
test('no invented risk defaults or nominee relations',()=>{
  const p=makePlan({people:[{nid:'0012345678'},{relationship:'unknown'}]});
  assert.equal(p.applicantNid,'0012345678');assert.deepEqual(p.steps['Risk Grading'],[]);
  assert.equal(p.steps['Nominee uploads'].find(a=>a.label==='Nominee relation').value,'');
  assert.equal(relations.length,27);assert.equal(new Set(relations).size,27);
});
test('saved risk answers work without a separate verification checkbox; absent answers stay absent',()=>{
  const p=makePlan({people:[{}],ekyc:{pep:'No',sourceCredible:'YES(Risk-1)',confirmed:false}});
  assert.deepEqual(p.steps['Risk Grading'].map(a=>[a.label,a.value]),[['PEP','No'],['Credible source of funds','YES(Risk-1)']]);
});
test('multiple nominees stop; single spouse does not autofill; correct docs targeted',()=>{
  const p=makePlan({people:[{nid:'123'},{},{}],ekyc:{maritalStatus:'SINGLE',spouseName:'OLD'}});
  assert.deepEqual(p.steps['Nominee Information'],[]);
  assert.equal(p.steps['Personal Information'].some(a=>a.label==='Spouse name'),false);
  assert.equal(p.steps['Additional File Upload'].length,1);
  assert.match(p.steps['Additional File Upload'][0].selector,/sourceOfFundDoc/);
  assert.equal(p.steps['Provide Customer Signature'][0].value,'');
});
function harness(head='Dedupe And SDN Check',origin='https://dob-ab.citybankplc.com'){
  let listener,interval,events={},nodes={},clicks=0;
  class Input {constructor(value=''){this._value=value;this.tagName='INPUT';this.files=[];}get value(){return this._value;}set value(v){this._value=v;}dispatchEvent(){}click(){this.checked=true;clicks++;}}
  class Select extends Input {constructor(options){super();this.tagName='SELECT';this.options=options;}}
  Object.defineProperty(Select.prototype,'value',Object.getOwnPropertyDescriptor(Input.prototype,'value'));
  const window={addEventListener(){}};window.top=window;
  const context={window,location:{origin,pathname:'/admin/onboarding'},document:{addEventListener:(t,f)=>events[t]=f,querySelectorAll:s=>s==='h1,h2,h3,h4'?[{textContent:head}]:(nodes[s]||[]),querySelector:s=>(nodes[s]||[])[0]},HTMLInputElement:Input,HTMLSelectElement:Select,Event:class {constructor(t){this.type=t;}},setInterval:f=>(interval=f,1),clearInterval:()=>{},chrome:{runtime:{id:'self',onMessage:{addListener:f=>listener=f}}},File:class{constructor(bytes,name){this.name=name;this.bytes=bytes;}},DataTransfer:class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)};}},Uint8Array,atob:s=>Buffer.from(s,'base64').toString('binary')};
  vm.runInNewContext(fs.readFileSync(new URL('./autofill-content.js',import.meta.url),'utf8'),context);
  return {Input,Select,nodes,events,context,get clicks(){return clicks;},send(message){let response;listener?.(message,{id:'self'},r=>response=r);return response;},tick:()=>interval?.(),status(){return this.send({type:'CITY_AUTOFILL_STATUS'});}};
}
test('content fills once, pauses, stops and never clicks Next',async()=>{
  const h=harness(),input=new h.Input();h.nodes['input#nid']=[input];
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'00123',serial:'TEST',steps:{'Dedupe And SDN Check':[{selector:'input#nid',type:'text',label:'NID',value:'00123'}]}}});
  assert.equal(input.value,'00123');assert.equal(h.clicks,0);
  input.value='manual';await h.tick();assert.equal(input.value,'manual');
  h.send({type:'CITY_AUTOFILL_STOP'});assert.equal(h.status().active,false);
});
test('different customer NID stops before any modification',()=>{
  const h=harness(),input=new h.Input('different');h.nodes['input#nid']=[input];
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Dedupe And SDN Check':[{selector:'input#nid',type:'text',value:'123'}]}}});
  assert.equal(input.value,'different');assert.equal(h.status().paused,true);
});
test('manual fingerprint, live photo and FATCA pages are untouched',()=>{
  for(const page of ['Fingerprint Verification','Provide Customer Photo','FATCA']){
    const h=harness(page);h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Upload NID':[]}}});
    assert.match(h.status().status,/Manual/);assert.equal(h.clicks,0);
  }
});
test('content refuses other origins and final report route',()=>{
  assert.equal(harness('Risk Grading','https://example.org').status(),undefined);
  const h=harness();h.context.location.pathname='/admin/onboarding/account-report';
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{}}});assert.match(h.status().status,/Manual page/);
});
test('missing dynamic option retries and manual changes are preserved',async()=>{
  const h=harness('Risk Grading'),select=new h.Select([]);h.nodes['select#test']=[select];
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Risk Grading':[{selector:'select#test',type:'select',label:'Test',value:'No'}]}}});
  assert.match(h.status().status,/option loading/);
  select.options=[{text:'No',value:'N'}];await h.tick();assert.equal(select.value,'N');
  h.events.input({isTrusted:true,target:select});select.value='Y';await h.tick();assert.equal(select.value,'Y');
});
test('prepared JPEG upload is bounded and duplicate upload is avoided',async()=>{
  const h=harness('Provide Customer Signature'),input=new h.Input();h.nodes['input#file']=[input];
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Provide Customer Signature':[{selector:'input#file',type:'file',value:'data:image/jpeg;base64,YWJj',filename:'test.jpg',label:'card'}]}}});
  assert.equal(input.files.length,1);await h.tick();assert.equal(input.files.length,1);assert.equal(h.clicks,0);
});
test('FATCA subsection does not block Source of Fund on Additional page',()=>{
  const h=harness('Additional File Upload'),input=new h.Input();h.nodes['input#fund']=[input];
  const query=h.context.document.querySelectorAll;
  h.context.document.querySelectorAll=s=>s==='h1,h2,h3,h4'?[{textContent:'Additional File Upload'},{textContent:'FATCA'}]:query(s);
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Additional File Upload':[{selector:'input#fund',type:'file',value:'data:image/jpeg;base64,YWJj',filename:'fund.jpg',label:'fund'}]}}});
  assert.equal(input.files.length,1);assert.equal(h.clicks,0);
});
test('heading matching normalizes whitespace and case',()=>{
  const h=harness('  Upload  NID\n');
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Upload NID':[{type:'text',selector:'input#date',label:'date',value:'test'}]}}});
  assert.equal(h.status().step,'Upload NID');
});
test('ARIA headings and non-heading NID title are recognized safely',()=>{
  for(const aria of [true,false]){
    const h=harness(''),input=new h.Input();
    if(aria)h.nodes['h5,h6,[role="heading"]']=[{textContent:'Upload NID'}];
    else for(const s of ['input[type="file"][id^="nidFront-"]','input[type="file"][id^="nidBack-"]','input[placeholder="DD/MM/YYYY"]','select#name'])h.nodes[s]=[input];
    h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Upload NID':[{type:'text',selector:'input#date',label:'date',value:'test'}]}}});
    assert.equal(h.status().step,'Upload NID');
  }
});
test('partial upload controls are not sufficient for fallback detection',()=>{
  const h=harness('');h.nodes['input[type="file"][id^="nidFront-"]']=[new h.Input()];
  h.send({type:'CITY_AUTOFILL_START',plan:{applicantNid:'123',steps:{'Upload NID':[]}}});
  assert.match(h.status().status,/Unmapped/);
});
