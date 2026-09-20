import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationMatches } from './admin-tabs.js';

test('application tabs filter by workflow status, keeping rejected records in All Data', () => {
  const cases = ['submitted','resubmitted','correction_required','data_approved','bank_processing','completed','rejected'].map(workflow_status=>({workflow_status}));
  const statuses = tab => cases.filter(c=>applicationMatches(c,tab)).map(c=>c.workflow_status);
  assert.equal(statuses('all').length,7);
  assert.deepEqual(statuses('pending'),['submitted','resubmitted','correction_required','data_approved']);
  assert.deepEqual(statuses('bank_processing'),['bank_processing']);
  assert.deepEqual(statuses('completed'),['completed']);
  assert.deepEqual(cases.filter(c=>applicationMatches(c,'unknown')),[]);
});
