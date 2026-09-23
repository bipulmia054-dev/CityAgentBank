import json
import base64
import io
import unittest
from unittest.mock import patch, MagicMock
from PIL import Image
import ekyc_ai
from test_customer_assets import CustomerAssetsTest
import local_server as server


class AiRulesTest(unittest.TestCase):
    def test_duplicate_processing_rejected_and_guard_released(self):
        with patch('ekyc_ai.prepare',side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):ekyc_ai.prepare_customer(99,{},'fake','all')
        self.assertNotIn(99,ekyc_ai._active)
        ekyc_ai._active.add(99)
        try:
            with self.assertRaises(ValueError):ekyc_ai.prepare_customer(99,{},'fake','all')
        finally:ekyc_ai._active.discard(99)

    def test_corrupt_image_never_sent(self):
        with patch('ekyc_ai.urllib.request.urlopen') as call:
            with self.assertRaises(Exception):ekyc_ai.prepare({'people':[{'idFront':'data:image/jpeg;base64,YQ=='}]},'fake')
        call.assert_not_called()

    def test_values_validated(self):
        for key,value in [('nid','123'),('dob','31/02/2000'),('monthlyIncome','-5'),('postalCode','12345')]:
            self.assertEqual(ekyc_ai.normalize({'key':key},value),'')
        self.assertEqual(ekyc_ai.normalize({'key':'nid'},'০১২৩৪৫৬৭৮৯'),'0123456789')

    def test_suggestions_reject_risk_locks_unclear_cross_person_and_invalid(self):
        image=io.BytesIO();Image.new('RGB',(20,20),'white').save(image,format='JPEG');source='data:image/jpeg;base64,'+base64.b64encode(image.getvalue()).decode()
        case={'people':[{'nid':'0123456789','idFront':source},{'idFront':source}], 'aiReview':{'locks':['people.0.nid']}}
        def item(path,value,source,certainty='clear'):
            return {'path':path,'value':value,'source':source,'evidence':'READABLE','certainty':certainty}
        output={'proposals':[
            item('people.0.name','TEST NAME','people.0.idFront'),
            item('people.0.nid','1111111111','people.0.idFront'),
            item('people.1.name','WRONG PERSON','people.0.idFront'),
            item('people.0.dob','31/02/2000','people.0.idFront'),
            item('ekyc.pep','No','declaration.rawDescription'),
            item('ekyc.transactions','700000','declaration.rawDescription'),
            item('people.0.gender','F','people.0.idFront','unclear')], 'issues':[], 'quality':[{'source':'people.0.idFront','status':'readable','reason':'test'}]}
        response=MagicMock();response.__enter__.return_value.read.return_value=json.dumps({'candidates':[{'content':{'parts':[{'text':json.dumps(output)}]}}]}).encode()
        with patch('ekyc_ai.urllib.request.urlopen',return_value=response) as call:
            result=ekyc_ai.prepare(case,'fake-key')
        self.assertEqual([p['path'] for p in result['proposals']],['people.0.name'])
        request=call.call_args.args[0]
        self.assertNotIn('fake-key',request.full_url)
        payload=json.loads(request.data)
        self.assertEqual(len([p for p in payload['contents'][0]['parts'] if 'inlineData' in p]),2)

    def test_history_ignores_client_forged_history_and_caps_records(self):
        old={'people':[{'name':'A'}],'aiReview':{'history':[{'actor':'admin'}]*20}}
        new={'people':[{'name':'B'}],'aiReview':{'history':[{'actor':'forged'}]}}
        result=ekyc_ai.record_history(old,new,'real-admin','now')
        self.assertEqual(len(result['aiReview']['history']),20)
        self.assertEqual(result['aiReview']['history'][-1]['actor'],'real-admin')


class AiEndpointTest(CustomerAssetsTest):
    def test_prepare_is_read_only_and_rechecks_revision(self):
        with server.db() as con:
            con.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('gemini_api_key','fake-test-key')")
            before=dict(con.execute('SELECT case_json,revision FROM customers WHERE id=1').fetchone())
        with patch('ekyc_ai.prepare_customer',return_value={'proposals':[],'issues':[],'quality':[]}):
            status,body=self.request('/api/admin/customers/1/ai-prepare',{'revision':before['revision']})
        self.assertEqual(status,200,body)
        with server.db() as con:self.assertEqual(dict(con.execute('SELECT case_json,revision FROM customers WHERE id=1').fetchone()),before)
        def concurrent(*args):
            with server.db() as con:con.execute('UPDATE customers SET revision=revision+1 WHERE id=1')
            return {'proposals':[],'issues':[],'quality':[]}
        with patch('ekyc_ai.prepare_customer',side_effect=concurrent):
            self.assertEqual(self.request('/api/admin/customers/1/ai-prepare',{'revision':before['revision']})[0],409)

    def test_prepare_worker_forbidden_and_revision_required(self):
        self.assertEqual(self.request('/api/admin/customers/1/ai-prepare',{'revision':1},user='worker')[0],403)
        self.assertEqual(self.request('/api/admin/customers/1/ai-prepare',{'revision':9999})[0],409)

    def test_history_written_and_returned_on_save(self):
        status,body=self.request('/api/admin/customers/1')
        customer=json.loads(body)['customer'];case=customer['case'];case['people'][0]['name']='UPDATED'
        status,body=self.request('/api/admin/customers/1',{'case':case,'revision':customer['revision']},method='PUT')
        self.assertEqual(status,200,body)
        history=json.loads(body)['history']
        self.assertTrue(any(c['path']=='people.0.name' for c in history[-1]['changes']))
