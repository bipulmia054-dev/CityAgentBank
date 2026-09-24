import test from 'node:test';
import assert from 'node:assert/strict';
import { applicantContact, updateApplicantContact, contactValidationError } from './admin-personal-info.js';

test('missing personal information stays blank, never inferred', () => {
  assert.deepEqual(applicantContact({}), { email: '', gender: '' });
});
test('email updates both persisted contact representations without losing other data', () => {
  const original = { details: { phone: '123', email: 'old@example.com' }, people: [{ nid: '123', email: 'old@example.com' }, { name: 'Nominee' }], docs: ['keep'] };
  const updated = updateApplicantContact(original, 'email', 'new@example.com');
  assert.equal(updated.details.email, 'new@example.com');
  assert.equal(updated.people[0].email, 'new@example.com');
  assert.equal(updated.people[0].nid, '123');
  assert.equal(updated.details.phone, '123');
  assert.equal(updated.people[1], original.people[1]);
  assert.equal(original.details.email, 'old@example.com');
  assert.deepEqual(applicantContact(JSON.parse(JSON.stringify(updated))), { email: 'new@example.com', gender: '' });
  assert.equal(applicantContact(updateApplicantContact(updated, 'email', '')).email, '');
});
test('gender persists separately from contact and nominee', () => {
  const updated = updateApplicantContact({ people: [{name: 'Applicant'}, {gender: 'F'}] }, 'gender', 'M');
  assert.equal(applicantContact(updated).gender, 'M');
  assert.equal(updated.people[1].gender, 'F');
  assert.equal(contactValidationError(updated), '');
});
test('validation accepts blank and rejects invalid data', () => {
  assert.equal(contactValidationError({}), '');
  assert.notEqual(contactValidationError({ details: { email: 'bad' } }), '');
  assert.notEqual(contactValidationError({ people: [{ gender: 'invalid' }] }), '');
});
test('partial married draft saves without spouse; income must be positive', () => {
  assert.equal(contactValidationError({ekyc:{maritalStatus:'MARRIED'}}),'');
  assert.equal(contactValidationError({ekyc:{maritalStatus:'MARRIED',spouseName:'TEST SPOUSE'}}),'');
  assert.equal(contactValidationError({ekyc:{maritalStatus:'SINGLE'}}),'');
  assert.notEqual(contactValidationError({ekyc:{monthlyIncome:'-1'}}),'');
});
