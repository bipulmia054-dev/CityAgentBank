import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProposals,undoChanges,remainingItems,fillKnownFields,lockReviewedFields,unlockReviewedFields} from './ekyc-review.js';
import {workflowDefaults} from './ekyc-defaults.js';
const sample=()=>({name:'OLD',people:[{name:'OLD',nid:'0123456789'},{name:'NOMINEE'}],ekyc:{confirmed:true},aiReview:{locks:['people.0.nid']}});
test('English address formatting keeps locality, postcode and documented name prefix',()=>{
  const data={people:[{name:'Mosa: Asma',nameBn:'মোছাঃ আসমা',village:'Chandbil',postOffice:'আমঝুপী',postCode:'৭১০১'},{village:'Other Village',postOffice:'Other Post',postCode:'1234',thana:'Other Thana',district:'Other District'}],ekyc:{district:'মেহেরপুর',thana:'মেহেরপুর সদর'}};
  const next=fillKnownFields(data);
  assert.equal(next.ekyc.district,'MEHERPUR');assert.equal(next.ekyc.thana,'MEHERPUR SADAR');
  assert.equal(next.ekyc.addressLine1,'CHANDBIL, AMJHUPI - 7101');assert.equal(next.ekyc.addressLine2,'MEHERPUR SADAR, MEHERPUR');assert.equal(next.ekyc.postalCode,'7101');
  assert.equal(next.people[1].ekycAddressLine1,'OTHER VILLAGE, OTHER POST - 1234');assert.equal(next.people[1].ekycAddressLine2,'OTHER THANA, OTHER DISTRICT');
  assert.equal(next.people[0].name,'MST. ASMA');assert.equal(next.name,'MST. ASMA');assert.equal(next.people[0].nameBn,'মোছাঃ আসমা');
  const locked=fillKnownFields({...data,aiReview:{locks:['ekyc.district','people.0.name']}});assert.equal(locked.ekyc.district,'মেহেরপুর');assert.equal(locked.people[0].name,'Mosa: Asma');
  const documented=fillKnownFields({people:[{name:'Mosa Example'}]});assert.equal(documented.people[0].name,'MOSA EXAMPLE');
});
test('review lock covers filled fields, preserves data and survives JSON persistence',()=>{
  const data=fillKnownFields(sample());const locked=JSON.parse(JSON.stringify(lockReviewedFields(data)));
  assert.ok(locked.aiReview.locks.includes('ekyc.pep'));assert.ok(locked.aiReview.locks.includes('people.0.name'));
  assert.ok(!locked.aiReview.locks.includes('people.0.dob'));assert.equal(locked.ekyc.confirmed,true);
  const proposal={path:'people.0.name',before:'OLD',value:'AI CHANGE'};
  assert.equal(applyProposals(locked,[proposal],[proposal.path]),locked);
  const unlocked=unlockReviewedFields(locked);assert.equal(unlocked.aiReview.locks.length,0);assert.equal(unlocked.people[0].name,'OLD');
  assert.equal(applyProposals(unlocked,[proposal],[proposal.path]).people[0].name,'AI CHANGE');
});
test('operator-selected editable defaults fill blank fields and preserve overrides',()=>{
  const next=fillKnownFields({people:[{}],ekyc:{thana:'MEHERPUR SADAR',permanent_district:'MEHERPUR'}});
  assert.equal(next.ekyc.onboarding,'By Direct Sales agent (Risk-2)');assert.equal(next.ekyc.product,'Savings account');
  assert.equal(next.ekyc.district,'MEHERPUR');assert.equal(next.ekyc.division,'KHULNA');assert.equal(next.ekyc.permanent_division,'KHULNA');
  for(const [key,value] of Object.entries(workflowDefaults))assert.equal(next.ekyc[key],value);
  const existing=fillKnownFields({ekyc:{onboarding:'Walk in/Unsolicited (Risk-3)',product:'Current account',district:'DHAKA',division:'DHAKA'}});
  assert.equal(existing.ekyc.product,'Current account');assert.equal(existing.ekyc.division,'DHAKA');
  const districtOnly=fillKnownFields({ekyc:{district:'MEHERPUR'}});assert.equal(districtOnly.ekyc.thana,undefined);
});
test('one click maps saved personal, address, explicit risk and profession values without AI',()=>{
  const data={people:[{profession:'কৃষক',gender:'Male',religion:'Islam',education:'HSC',issuePlaceEn:'MEHERPUR'}],declaration:{monthlyIncome:'২০,০০০',district:'MEHERPUR',thana:'MEHERPUR SADAR'},details:{pep:'No'}};
  const next=fillKnownFields(data);
  assert.equal(next.people[0].gender,'M');assert.equal(next.ekyc.religion,'ISLAM');assert.equal(next.ekyc.education,'H.S.C');
  assert.equal(next.ekyc.monthlyIncome,'20000');assert.equal(next.ekyc.district,'MEHERPUR');assert.equal(next.ekyc.pep,'No');
  assert.equal(next.ekyc.profession,'Farmer/Fishermen');assert.equal(next.ekyc.sector,'FARMER');assert.match(next.ekyc.occupation,/Farmer/);
  assert.equal(next.ekyc.sourceCredible,workflowDefaults.sourceCredible);assert.equal(next.ekyc.transactions,workflowDefaults.transactions);assert.equal(data.ekyc,undefined);
});
test('nominee address uses own full English address and never applicant address',()=>{
  const data={people:[{addressEn:'APPLICANT ONLY',issuePlace:'মেহেরপুর'},{addressEn:'VILLAGE A, UNION B, MEHERPUR SADAR, MEHERPUR'},{addressEn:'OTHER VILLAGE, OTHER DISTRICT'},{addressBn:'অজানা'},{addressEn:'FULL ADDRESS',ekycAddressLine1:'MANUAL'}]};
  const next=fillKnownFields(data);
  assert.equal(next.people[1].ekycAddressLine1,'VILLAGE A, UNION B');assert.equal(next.people[1].ekycAddressLine2,'MEHERPUR SADAR, MEHERPUR');
  assert.equal(next.people[2].ekycAddressLine1,'OTHER VILLAGE');assert.equal(next.people[2].ekycAddressLine2,'OTHER DISTRICT');assert.equal(next.people[3].ekycAddressLine1,undefined);
  assert.equal(next.people[4].ekycAddressLine1,'MANUAL');assert.equal(next.ekyc.issuePlace,'MEHERPUR');
  assert.equal(fillKnownFields({people:[{}]}).ekyc.issuePlace,undefined);
});
test('known fill preserves manual values, locks and ambiguous jobs',()=>{
  const data={people:[{profession:'employee',education:'HSC'}],ekyc:{religion:'HINDU'},aiReview:{locks:['ekyc.education']}};
  const next=fillKnownFields(data);assert.equal(next.ekyc.education,undefined);assert.equal(next.ekyc.religion,'HINDU');assert.equal(next.ekyc.occupation,undefined);
});
test('explicit risk needs an existing matching source, permanent address may use extracted evidence',()=>{
  const data={details:{pep:'No'},people:[{}]};const proposals=[{path:'ekyc.pep',source:'details.pep',value:'No',before:''},{path:'ekyc.sourceCredible',source:'details.pep',value:'YES(Risk-1)',before:''},{path:'ekyc.permanent_district',source:'people.0.idBack',value:'MEHERPUR',before:''}];
  const next=applyProposals(data,proposals,proposals.map(p=>p.path));assert.equal(next.ekyc.pep,'No');assert.equal(next.ekyc.sourceCredible,undefined);assert.equal(next.ekyc.permanent_district,'MEHERPUR');
});
test('AI apply skips locks, human declarations, unknown fields and stale values',()=>{
  const data=sample();const proposals=[
    {path:'people.0.name',before:'OLD',value:'NEW'},
    {path:'people.0.nid',before:'0123456789',value:'9876543210'},
    {path:'ekyc.pep',before:'',value:'No'},
    {path:'ekyc.transactions',before:'',value:'made up'},
    {path:'people.1.name',before:'DIFFERENT',value:'WRONG'},
    {path:'__proto__.polluted',before:'',value:'BAD'}];
  const next=applyProposals(data,proposals,proposals.map(p=>p.path));
  assert.equal(next.people[0].name,'NEW');assert.equal(next.name,'NEW');
  assert.equal(next.people[0].nid,'0123456789');assert.equal(next.people[1].name,'NOMINEE');
  assert.equal(next.ekyc.pep,undefined);assert.equal(next.ekyc.confirmed,false);assert.equal({}.polluted,undefined);
  assert.equal(data.people[0].name,'OLD');
});
test('AI proposal is never applied without selection',()=>{const c=sample();assert.equal(applyProposals(c,[{path:'people.0.name',before:'OLD',value:'NEW'}],[]),c);});
test('one-click mode applies every eligible returned value, still preserving locks and unknown risk answers',()=>{
  const c=sample();const proposals=[{path:'people.0.name',before:'OLD',value:'AUTO NAME'},{path:'people.1.ekycAddressLine1',before:'',value:'TEST ADDRESS'},{path:'ekyc.pep',before:'',value:'No'}];
  const next=applyProposals(c,proposals,proposals.map(p=>p.path));
  assert.equal(next.name,'AUTO NAME');assert.equal(next.people[1].ekycAddressLine1,'TEST ADDRESS');assert.equal(next.ekyc.pep,undefined);
  assert.ok(!remainingItems(next).some(v=>v.includes('confirmation')));
});
test('undo protects locks and later edits, clears confirmation',()=>{
  const c=sample();const next=undoChanges(c,{changes:[{path:'people.0.name',before:'PREVIOUS',after:'OLD'},{path:'people.0.nid',before:'9999999999',after:'0123456789'},{path:'people.1.name',before:'WRONG',after:'STALE'}]});
  assert.equal(next.name,'PREVIOUS');assert.equal(next.people[0].nid,c.people[0].nid);assert.equal(next.people[1].name,'NOMINEE');assert.equal(next.ekyc.confirmed,false);
});
test('remaining list recalculates as required fields are completed; unknown assets not ready',()=>{
  const c=sample();assert.ok(remainingItems(c).includes('Applicant: dob'));
  c.people[0].dob='10/01/2000';assert.ok(!remainingItems(c).includes('Applicant: dob'));
  c.people[0].dob='31/02/2000';assert.ok(remainingItems(c).some(v=>v.includes('DOB সঠিক নয়')));
  assert.ok(remainingItems(c).some(v=>v.includes('Income Declaration')));
});
