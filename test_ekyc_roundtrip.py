import json
from test_customer_assets import CustomerAssetsTest

class EkycRoundTripTest(CustomerAssetsTest):
    def test_autosave_revision_conflict(self):
        status,body=self.request('/api/admin/customers/1')
        self.assertEqual(status,200,body)
        customer=json.loads(body)['customer']
        case=customer['case'];revision=customer['revision']
        case['name']='AUTOSAVE TEST'
        status,body=self.request('/api/admin/customers/1',{'case':case,'revision':revision},method='PUT')
        self.assertEqual(status,200,body)
        self.assertEqual(json.loads(body)['revision'],revision+1)
        case['name']='STALE DATA'
        status,body=self.request('/api/admin/customers/1',{'case':case,'revision':revision},method='PUT')
        self.assertEqual(status,409,body)
        status,body=self.request('/api/customers/1/extension')
        self.assertEqual(json.loads(body)['case']['name'],'AUTOSAVE TEST')

    def test_ekyc_roundtrip(self):
        case = {'name':'TEST','details':{'email':'test@example.invalid','phone':'01700000000'},
                'people':[{'nid':'0012345678','gender':'M','email':'test@example.invalid'},
                          {'name':'NOMINEE','relationship':'BROTHER','ekycAddressLine1':'TEST VILLAGE'}],
                'ekyc':{'religion':'ISLAM','education':'H.S.C','maritalStatus':'MARRIED',
                        'spouseName':'TEST SPOUSE','transactions':'test band','pep':'No','confirmed':True},'docs':[]}
        status,body=self.request('/api/admin/customers/1',{'case':case},method='PUT')
        self.assertEqual(status,200,body)
        status,body=self.request('/api/customers/1/extension')
        self.assertEqual(status,200,body)
        saved=json.loads(body)['case']
        self.assertEqual(saved,case)
        self.assertEqual(self.request('/api/admin/customers/1',{'case':case},user='worker',method='PUT')[0],403)
        self.assertEqual(self.request('/api/customers/1/extension',user='worker')[0],403)
