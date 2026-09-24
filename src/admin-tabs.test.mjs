import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationMatches, applicationSearchMatches } from './admin-tabs.js';
test('application search supports serial, names, Bangla digits, collector and status intersection',()=>{
  const item={serial:'CUST-000056',name:'Test Name',phone:'01712345678',worker_name:'Collector One',workflow_status:'completed'};
  for(const query of ['','test','000056','০১৭১২৩','COLLECTOR one','test 000056'])assert.ok(applicationSearchMatches(item,query));
  assert.equal(applicationSearchMatches(item,'missing'),false);assert.equal(applicationSearchMatches({},'test'),false);
  assert.equal([item].filter(c=>applicationMatches(c,'pending')&&applicationSearchMatches(c,'test')).length,0);
});

test('application tabs filter by workflow status, keeping rejected records in All Data', () => {
  const cases = ['submitted','resubmitted','correction_required','data_approved','bank_processing','completed','rejected'].map(workflow_status=>({workflow_status}));
  const statuses = tab => cases.filter(c=>applicationMatches(c,tab)).map(c=>c.workflow_status);
  assert.equal(statuses('all').length,7);
  assert.deepEqual(statuses('pending'),['submitted','resubmitted','correction_required','data_approved']);
  assert.deepEqual(statuses('bank_processing'),['bank_processing']);
  assert.deepEqual(statuses('completed'),['completed']);
  assert.deepEqual(cases.filter(c=>applicationMatches(c,'unknown')),[]);
});
