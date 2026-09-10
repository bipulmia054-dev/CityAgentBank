"""Authenticated, revision-checked updates for extension and admin documents."""
import base64
import io
import json
import re
import uuid
import zipfile
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

DECLARATION_FIELDS = {'customerName', 'fatherName', 'motherName', 'address', 'postOffice', 'postCode', 'thana', 'district', 'rawDescription', 'polishedDescription', 'monthlyIncome', 'accountNumber'}

def initialize(con):
    con.execute('''CREATE TABLE IF NOT EXISTS customer_assets (
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, content BLOB NOT NULL, mime TEXT NOT NULL,
        PRIMARY KEY(customer_id,kind))''')

def binary(handler, content, mime, name):
    handler.send_response(200)
    handler.send_header('Content-Type', mime)
    handler.send_header('Cache-Control', 'no-store')
    handler.send_header('Content-Disposition', f'inline; filename="{name}"')
    handler.send_header('Content-Length', str(len(content)))
    handler.end_headers(); handler.wfile.write(content)

def dispatch(handler, method, path, db, archive_dir):
    match = re.fullmatch(r'/api/customers/(\d+)/(extension|revision|signature-card|income-declaration-card|declaration)', path)
    if not match: return False
    if not handler.authorized(): return None
    if not handler.is_admin(): return handler.reply(403, {'error':'শুধু অনুমোদিত Admin এই ফাইল দেখতে বা পরিবর্তন করতে পারবেন'})
    actor = handler.user()
    customer_id, action = int(match[1]), match[2]
    try:
        with db() as con:
            row = con.execute('SELECT c.*,u.full_name collector_name,u.phone collector_phone FROM customers c LEFT JOIN users u ON u.username=c.created_by WHERE c.id=?', (customer_id,)).fetchone()
            if not row: return handler.reply(404, {'error':'Customer পাওয়া যায়নি'})
            case = json.loads(row['case_json'] or '{}')
            if method == 'GET':
                if action == 'revision': return handler.reply(200, {'revision':row['revision']})
                if action == 'extension': return handler.reply(200, {'case':case, 'revision':row['revision'], 'collector':{'fullName':row['collector_name'] or row['created_by'], 'phone':row['collector_phone'] or ''}})
                if action == 'signature-card':
                    docs = [d for d in case.get('docs', []) if d.get('kind') == 'signature_card']
                    return handler.reply(200, {'documents':docs,'revision':row['revision']})
                if action == 'income-declaration-card':
                    asset = con.execute('SELECT content,mime FROM customer_assets WHERE customer_id=? AND kind=?',(customer_id,'declaration_card')).fetchone()
                    if not asset: return handler.reply(200, {'documents':[],'revision':row['revision']})
                    return handler.reply(200, {'documents':[{'kind':'income_declaration_card','name':'Income Declaration','pages':['data:'+asset['mime']+';base64,'+base64.b64encode(asset['content']).decode('ascii')]}],'revision':row['revision']})
                asset = con.execute('SELECT content,mime FROM customer_assets WHERE customer_id=? AND kind=?',(customer_id,'declaration')).fetchone()
                if asset: return binary(handler, asset['content'], asset['mime'], 'Income_Declaration.pdf')
                archive = Path(row['archive_path'])
                if archive.parent.resolve() == Path(archive_dir).resolve() and archive.is_file() and zipfile.is_zipfile(archive):
                    with zipfile.ZipFile(archive) as zipped:
                        name = next((n for n in zipped.namelist() if n.endswith('/Income_Declaration.pdf')), None)
                        if name: return binary(handler, zipped.read(name), 'application/pdf', 'Income_Declaration.pdf')
                return handler.reply(404, {'error':'PDF তৈরি করে Save করুন'})
        if method != 'POST' or action not in ('signature-card','income-declaration-card','declaration'): return handler.reply(405, {'error':'Method not allowed'})
        data = handler.body(30 * 1024 * 1024)
        if action in ('signature-card','income-declaration-card'):
            source = data.get('image', '')
            if not isinstance(source,str) or not re.match(r'^data:image/(jpeg|png|webp);base64,', source): raise ValueError('সঠিক JPG/PNG ছবি দিন')
            image = Image.open(io.BytesIO(base64.b64decode(source.split(',',1)[1], validate=True)))
            if image.width * image.height > 25000000: raise ValueError('ছবি অতিরিক্ত বড়')
            image.load(); image = image.convert('RGB'); image.thumbnail((2480,3508))
            output = io.BytesIO(); image.save(output, 'JPEG', quality=92)
            source = 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode()
        else:
            details = data.get('declaration')
            if not isinstance(details,dict): raise ValueError('Declaration details দিন')
            details = {k:str(v)[:12000] for k,v in details.items() if k in DECLARATION_FIELDS}
            pdf = data.get('pdf','')
            if not isinstance(pdf,str) or not pdf.startswith('data:application/pdf;base64,'): raise ValueError('PDF পাওয়া যায়নি')
            content = base64.b64decode(pdf.split(',',1)[1], validate=True)
            reader = PdfReader(io.BytesIO(content))
            if not 1 <= len(reader.pages) <= 10: raise ValueError('PDF page count সঠিক নয়')
        with db() as con:
            con.execute('BEGIN IMMEDIATE')
            row = con.execute('SELECT case_json,revision FROM customers WHERE id=?', (customer_id,)).fetchone()
            if not row: return handler.reply(404, {'error':'Customer পাওয়া যায়নি'})
            if data.get('revision') != row['revision']: return handler.reply(409, {'error':'ফাইল অন্য জায়গায় পরিবর্তিত হয়েছে। Refresh করে আবার Save করুন'})
            case = json.loads(row['case_json'] or '{}')
            if action == 'signature-card':
                docs = [d for d in case.get('docs',[]) if d.get('kind') != 'signature_card']
                docs.append({'id':str(uuid.uuid4()),'kind':'signature_card','name':'Signed Signature Card','pages':[source]})
                case['docs'] = docs
            elif action == 'income-declaration-card':
                con.execute('INSERT OR REPLACE INTO customer_assets(customer_id,kind,content,mime) VALUES(?,?,?,?)',(customer_id,'declaration_card',output.getvalue(),'image/jpeg'))
            else:
                case['declaration'] = {**case.get('declaration',{}), **details, 'busy':False}
                con.execute('INSERT OR REPLACE INTO customer_assets(customer_id,kind,content,mime) VALUES(?,?,?,?)',(customer_id,'declaration',content,'application/pdf'))
            con.execute('UPDATE customers SET case_json=?,revision=revision+1 WHERE id=?',(json.dumps(case,ensure_ascii=False),customer_id))
            import worker_system
            worker_system.audit(con, actor, 'updated_'+action, 'customer', customer_id)
        return handler.reply(200, {'ok':True,'revision':row['revision']+1})
    except Exception as error:
        return handler.reply(400, {'error':str(error)})

def updated_archive(content, row, db):
    """Overlay latest signed card/PDF in ZIP downloads without changing original files."""
    case = json.loads(row['case_json'] or '{}')
    cards = [d for d in case.get('docs',[]) if d.get('kind') == 'signature_card']
    with db() as con:
        asset = con.execute('SELECT content FROM customer_assets WHERE customer_id=? AND kind=?',(row['id'],'declaration')).fetchone()
        declaration_card = con.execute('SELECT content FROM customer_assets WHERE customer_id=? AND kind=?',(row['id'],'declaration_card')).fetchone()
    if not cards and not asset and not declaration_card: return content
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(content)) as original, zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as target:
        root = original.namelist()[0].split('/')[0]
        for entry in original.infolist():
            if cards and ('signature_card' in entry.filename.lower() or 'signed_signature' in entry.filename.lower()): continue
            if asset and entry.filename.endswith('/Income_Declaration.pdf'): continue
            target.writestr(entry, original.read(entry.filename))
        for card in cards:
            for i,page in enumerate(card.get('pages',[])):
                from customer_archive import jpg
                target.writestr(f'{root}/Signed_Signature_Card_{i+1}.jpg',jpg(page))
        if asset: target.writestr(f'{root}/Income_Declaration.pdf',asset['content'])
        if declaration_card: target.writestr(f'{root}/Income_Declaration.jpg',declaration_card['content'])
    return output.getvalue()
