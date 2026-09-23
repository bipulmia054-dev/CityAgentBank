import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProposals,undoChanges,remainingItems} from './ekyc-review.js';
const sample=()=>({name:'OLD',people:[{name:'OLD',nid:'0123456789'},{name:'NOMINEE'}],ekyc:{confirmed:true},aiReview:{locks:['people.0.nid']}});
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
