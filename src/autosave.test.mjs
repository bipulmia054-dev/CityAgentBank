import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosave} from './autosave.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
test('opening a file does not write; edits debounce to the latest snapshot',async()=>{
  const writes=[];const save=createAutosave({initial:{v:0},write:async v=>writes.push(v),delay:5});
  await tick();assert.equal(writes.length,0);
  save.change({v:1});save.change({v:2});await tick();
  assert.deepEqual(writes,[{v:2}]);assert.equal(save.dirty(),false);save.dispose();
});
test('writes are serialized and edits during a request are retained',async()=>{
  const writes=[];let release;
  const save=createAutosave({initial:{v:0},delay:1000,write:async v=>{writes.push(v);if(v.v===1)await new Promise(r=>release=r);}});
  save.change({v:1});const flushed=save.flush();save.change({v:2});
  assert.equal(writes.length,1);release();assert.equal(await flushed,true);
  assert.deepEqual(writes,[{v:1},{v:2}]);assert.equal(save.dirty(),false);save.dispose();
});
test('failed writes remain dirty, retry saves without losing the value',async()=>{
  let fail=true;const statuses=[];
  const save=createAutosave({initial:{v:0},delay:1000,notify:v=>statuses.push(v),write:async()=>{if(fail)throw Error('offline');}});
  save.change({v:1});assert.equal(await save.flush(),false);assert.equal(save.dirty(),true);
  assert.equal(statuses.at(-1).state,'error');fail=false;
  assert.equal(await save.flush(),true);assert.equal(save.dirty(),false);save.dispose();
});
test('invalid partial fields are not saved; correction recovers',async()=>{
  const writes=[];const save=createAutosave({initial:{name:'A'},delay:1000,write:async v=>writes.push(v),validate:v=>v.name?'':'Name required'});
  save.change({name:''});assert.equal(await save.flush(),false);assert.equal(writes.length,0);
  save.change({name:'B'});assert.equal(await save.flush(),true);assert.deepEqual(writes,[{name:'B'}]);save.dispose();
});
test('flush saves immediately before close; unchanged flush does not write twice',async()=>{
  let writes=0;const save=createAutosave({initial:{v:0},delay:1000,write:async()=>writes++});
  save.change({v:1});assert.equal(await save.flush(),true);await save.flush();assert.equal(writes,1);save.dispose();
});
test('different customer controllers never share data',async()=>{
  const a=[],b=[];
  const first=createAutosave({initial:{id:1,v:0},write:async v=>a.push(v),delay:1000});
  const second=createAutosave({initial:{id:2,v:0},write:async v=>b.push(v),delay:1000});
  first.change({id:1,v:1});second.change({id:2,v:2});await Promise.all([first.flush(),second.flush()]);
  assert.equal(a[0].id,1);assert.equal(b[0].id,2);first.dispose();second.dispose();
});
