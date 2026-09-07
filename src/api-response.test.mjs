import test from 'node:test';
import assert from 'node:assert/strict';
import {readJson} from './api-response.js';
test('image proxy HTML errors become readable status messages', async () => {
  for (const status of [413,502,503,504,401,403]) {
    await assert.rejects(readJson(new Response('<html><h1>Error</h1></html>',{status})), error => error.message.includes(`HTTP ${status}`) && !error.message.includes('Unexpected token') && !error.message.includes('<html>'));
  }
});
test('preserves API validation and successful image results', async () => {
  assert.deepEqual(await readJson(new Response(JSON.stringify({image:'data:image/png;base64,test'}))),{image:'data:image/png;base64,test'});
  assert.deepEqual(await readJson(new Response(JSON.stringify({error:'Validation failed'}),{status:400})),{error:'Validation failed'});
});
test('rejects malformed successful responses',async()=>{
  for(const body of ['<html>SPA</html>','null','[]','']) await assert.rejects(readJson(new Response(body)));
});
