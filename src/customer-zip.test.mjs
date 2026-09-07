import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {buildCustomerZip} from './customer-zip.js';
test('worker collection never calls AI or generates declaration PDF',async()=>{
 const fail=()=>{throw new Error('Processing must not run')};
 const result=await buildCustomerZip({collectionOnly:true,name:'Test',details:{},people:[],docs:[],declaration:{rawDescription:'Grocery shop'}},
 {jpeg:fail,identityPdf:fail,docPdf:fail,declarationPdf:fail,signatureScan:fail,blob:fail});
 const archive=await JSZip.loadAsync(await result.arrayBuffer());
 assert.ok(!Object.keys(archive.files).some(name=>name.endsWith('Income_Declaration.pdf')));
});
