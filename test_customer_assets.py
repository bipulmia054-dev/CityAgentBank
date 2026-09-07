import base64
import io
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
import local_server as server

class CustomerAssetsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        server.DATA_DIR = Path(cls.temp.name)
        server.ARCHIVE_DIR = server.DATA_DIR / 'customers'
        server.DB_PATH = server.DATA_DIR / 'test.db'
        server.initialize()
        cls.pdf = io.BytesIO(); pdf = canvas.Canvas(cls.pdf); pdf.drawString(40,700,'Test income declaration'); pdf.save()
        cls.picture = io.BytesIO(); Image.new('RGB',(100,100),'white').save(cls.picture,'JPEG')
        archive = server.ARCHIVE_DIR / 'sample.zip'
        with zipfile.ZipFile(archive,'w') as zipped: zipped.writestr('TEST/Income_Declaration.pdf',cls.pdf.getvalue())
        with server.db() as con:
            for name,role in [('admin','master_admin'),('worker','worker')]:
                con.execute("INSERT INTO users(username,password_hash,salt,created_at,role,status) VALUES(?,?,?,'2026-01-01',?,'approved')",(name,'unused','unused',role))
                con.execute("INSERT INTO sessions(token,username,expires_at) VALUES(?,?,'2099-01-01')",(name,name))
            con.execute("INSERT INTO customers(id,serial,name,phone,customer_number,archive_name,archive_path,created_at,created_by,case_json) VALUES(1,'T1','TEST','01700000000','0012345678','sample.zip',?,'2026-01-01','worker',?)",(str(archive),json.dumps({'people':[{'nid':'0012345678'}],'docs':[],'declaration':{'customerName':'TEST'}})))
        cls.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        threading.Thread(target=cls.http.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.http.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown(); cls.http.server_close(); cls.temp.cleanup()

    def request(self,path,body=None,user='admin'):
        req=urllib.request.Request(self.url+path,data=json.dumps(body).encode() if body is not None else None,headers={'Cookie':'ds_session='+user,'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req) as response:return response.status,response.read()
        except urllib.error.HTTPError as error:
            with error:return error.code,error.read()

    def test_registration_without_identity_uploads(self):
        with server.db() as con:
            con.execute("UPDATE users SET referral_code='TESTREF' WHERE username='admin'")
        payload = {'fullName':'Registration Test','phone':'01712345678','email':'test@example.invalid',
                   'username':'registration_test','password':'test-password-123','referralCode':'TESTREF'}
        status, body = self.request('/api/worker/register', payload, user='unknown')
        self.assertEqual(status, 201, body)
        with server.db() as con:
            row = con.execute("SELECT * FROM users WHERE username='registration_test'").fetchone()
            self.assertEqual(row['status'], 'pending')
            self.assertEqual(row['nid_number'], '')
            self.assertFalse(row['registration_json'])
        self.assertFalse((server.DATA_DIR / 'worker_registration').exists())
        self.assertEqual(self.request('/api/worker/register',payload,user='unknown')[0],400)
        payload.update(username='invalid_referral',referralCode='NO_SUCH_CODE')
        self.assertEqual(self.request('/api/worker/register',payload,user='unknown')[0],400)

    def test_01_master_admin_search_and_access_control(self):
        for query in ['0012345678','01700000000']:
            status,body=self.request('/api/customers?q='+query)
            self.assertEqual(status,200);self.assertEqual(json.loads(body)['customers'][0]['customer_number'],'0012345678')
        self.assertEqual(self.request('/api/customers/1/extension',user='worker')[0],403)
        self.assertEqual(self.request('/api/customers/1/extension',user='unknown')[0],401)

    def test_02_signature_update_revision_and_zip(self):
        value={'image':'data:image/jpeg;base64,'+base64.b64encode(self.picture.getvalue()).decode(),'revision':1}
        self.assertEqual(self.request('/api/customers/1/signature-card',value)[0],200)
        self.assertEqual(self.request('/api/customers/1/signature-card',value)[0],409)
        status,data=self.request('/api/customers/1/signature-card');self.assertEqual(json.loads(data)['revision'],2)
        self.assertEqual(len(json.loads(data)['documents']),1)
        _,content=self.request('/api/customers/1/download')
        with zipfile.ZipFile(io.BytesIO(content)) as archive:self.assertIn('TEST/Signed_Signature_Card_1.jpg',archive.namelist())

    def test_03_declaration_save_and_export(self):
        value={'declaration':{'monthlyIncome':'15000'},'pdf':'data:application/pdf;base64,'+base64.b64encode(self.pdf.getvalue()).decode(),'revision':2}
        self.assertEqual(self.request('/api/customers/1/declaration',value,user='worker')[0],403)
        self.assertEqual(self.request('/api/customers/1/declaration',value)[0],200)
        status,content=self.request('/api/customers/1/declaration');self.assertEqual(status,200);self.assertEqual(content,self.pdf.getvalue())
        _,data=self.request('/api/customers/1/extension');case=json.loads(data)['case'];self.assertEqual(case['declaration']['customerName'],'TEST');self.assertEqual(case['declaration']['monthlyIncome'],'15000');self.assertEqual(len(case['docs']),1)
        _,content=self.request('/api/customers/1/download')
        with zipfile.ZipFile(io.BytesIO(content)) as archive:self.assertEqual(archive.read('TEST/Income_Declaration.pdf'),self.pdf.getvalue())
        self.assertEqual(self.request('/api/customers/1/declaration',{**value,'revision':2,'pdf':'invalid'})[0],400)

if __name__=='__main__':unittest.main()
