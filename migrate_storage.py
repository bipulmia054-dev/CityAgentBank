"""Run once after copying the private data folder from Windows to a new server."""
import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path, PureWindowsPath

def migrate(data_dir):
    root=Path(data_dir).resolve(); database=root/'document_studio.db'
    if not database.is_file(): raise SystemExit('No document_studio.db in the selected data directory')
    backup=root/('before-migration-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.db')
    with sqlite3.connect(database) as con:
        with sqlite3.connect(backup) as copy: con.backup(copy)
        changed=0
        for customer_id,name,old_path in con.execute('SELECT id,archive_name,archive_path FROM customers').fetchall():
            path=root/'customers'/PureWindowsPath(old_path).name
            if not path.is_file():path=root/'customers'/PureWindowsPath(name).name
            if path.is_file(): con.execute('UPDATE customers SET archive_path=? WHERE id=?',(str(path),customer_id));changed+=1
        for user_id,value in con.execute("SELECT id,registration_json FROM users WHERE registration_json!=''").fetchall():
            files=json.loads(value)
            for key,old in files.items():
                parts=str(old).replace('\\','/').split('/')
                if 'worker_registration' not in parts:continue
                suffix=parts[parts.index('worker_registration'):]
                if any(p in ('','..','.') for p in suffix):continue
                path=root.joinpath(*suffix).resolve()
                if path.is_relative_to(root) and path.is_file():files[key]=str(path)
            con.execute('UPDATE users SET registration_json=? WHERE id=?',(json.dumps(files),user_id))
    print(f'Migrated {changed} customer paths. Backup: {backup.name}')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--data-dir',required=True);args=parser.parse_args();migrate(args.data_dir)
