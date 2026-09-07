"""Package built clients and the deployable server without private data/toolchains."""
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'outputs'

def zip_files(destination,files):
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for path,name in files: archive.write(path,name)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip():raise RuntimeError('Archive verification failed')

def extension():
    folder=OUT/'chrome-extension'
    zip_files(OUT/'Document-Studio-Chrome-Extension.zip',[(p,'chrome-extension/'+p.relative_to(folder).as_posix()) for p in folder.rglob('*') if p.is_file()])
    shutil.copy2(OUT/'Document-Studio-Chrome-Extension.zip',ROOT/'public/Document-Studio-Chrome-Extension.zip')
    shutil.copy2(OUT/'Document-Studio.apk',ROOT/'public/Document-Studio.apk')
    for old,new in [('Document-Studio.apk','City-Amjhupi.apk'),('Document-Studio-Chrome-Extension.zip','City-Amjhupi-Chrome-Extension.zip')]:
        shutil.copy2(OUT/old, OUT/new)
        shutil.copy2(OUT/new, ROOT/'public'/new)

def server():
    names=['local_server.py','worker_system.py','customer_archive.py','customer_assets.py','migrate_storage.py','requirements.txt','Dockerfile','compose.yaml','.dockerignore','SERVER-UPLOAD-BN.md']
    files=[(ROOT/name,name) for name in names]
    files += [(p,p.relative_to(ROOT).as_posix()) for p in (ROOT/'dist/client').rglob('*') if p.is_file()]
    zip_files(OUT/'Document-Studio-Server-Upload.zip',files)
    source_names=names+['package.json','package-lock.json','vite.config.js','vite.extension.config.js','index.html','worker.js','test_customer_assets.py','package_release.py']
    source=[(ROOT/name,name) for name in source_names]
    for folder in ['src','public','chrome-extension','android']:
        for path in (ROOT/folder).rglob('*'):
            if path.is_file() and not any(part in ('build','.gradle') for part in path.relative_to(ROOT).parts) and path.name!='local.properties':
                source.append((path,path.relative_to(ROOT).as_posix()))
    zip_files(OUT/'Document-Studio-Source.zip',source)
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file() and p.suffix in ('.apk', '.zip')}
    (OUT/'SHA256.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')
    for name in hashes:print(name,(OUT/name).stat().st_size)

if __name__=='__main__':
    import sys
    if '--clients' in sys.argv:extension()
    else:server()
