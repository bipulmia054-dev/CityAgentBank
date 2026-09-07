# citybank.abmgroup.tech — Server upload

Android ও Chrome extension-এর স্থায়ী ঠিকানা `https://citybank.abmgroup.tech/`। এই প্যাকেজ domain-এ deploy করা হয়নি। Python 3.11+, persistent disk এবং HTTPS আছে এমন VPS/container hosting প্রয়োজন। শুধু static HTML/public_html upload করলে login, scan বা search চলবে না।

## চালু করুন

1. Server ZIP application directory-তে extract করুন।
2. `data` folder তৈরি করুন, অথবা নিচের নিয়মে পুরোনো data copy করুন।
3. `docker compose up -d --build` চালান।
4. Hosting reverse proxy-তে `https://citybank.abmgroup.tech` → `http://127.0.0.1:8765` সেট করুন। বৈধ SSL, 100 MB request-body limit ও কমপক্ষে 180 seconds proxy timeout দিন।
5. `/api/auth/status` JSON response দিলে server চালু হয়েছে। খালি database হলে website থেকে প্রথম Admin account তৈরি করুন।
6. Admin → AI Settings-এ আপনার Gemini API key দিন। OCR এবং AI Recreate-এর জন্য বৈধ key ও internet প্রয়োজন।

Docker ছাড়া: `pip install -r requirements.txt`, তারপর `python local_server.py`। Process manager-এ auto-restart দিন। Environment: `PORT=8765`, `DATA_DIR=/আপনার/private/data`, `PUBLIC_URL=https://citybank.abmgroup.tech`। Frontend ইতিমধ্যে `dist/client`-এ build করা আছে।

## পুরোনো account/customer স্থানান্তর

প্যাকেজে private database, session, API key বা signing key নেই। পুরোনো server বন্ধ করে সম্পূর্ণ `data` folder backup/copy করুন—`document_studio.db`, customer archive, worker_registration ও hidden `.application-secret`-সহ। নতুন server-এর private `data` directory-তে রাখুন; public directory-তে নয়।

`python migrate_storage.py --data-dir /আপনার/private/data` চালান। Docker হলে startup-এর আগে `docker compose run --rm app python migrate_storage.py --data-dir /data` চালান। Script backup রেখে Windows file paths বদলায়। এরপর পুরোনো username/password ও customer records ব্যবহার করা যাবে। নিয়মিত পুরো data folder backup নিন।

## Upload-এর পর download links

- `https://citybank.abmgroup.tech/Document-Studio.apk`
- `https://citybank.abmgroup.tech/Document-Studio-Chrome-Extension.zip`

## Draft এবং reload

প্রতি username-এর অসম্পূর্ণ form ও ছবি একই browser/app-এর IndexedDB-তে সংরক্ষিত। স্বাভাবিক বন্ধ/reload-এর পর একই page/form ফিরে আসে। Clear শুধু চলমান draft মুছে দেয়; server-এ জমা দেওয়া customer মুছে দেয় না।

Draft অন্য ফোন/browser/domain-এ যায় না। Site data clear, app uninstall বা private browsing cleanup করলে local draft হারাবে। `ছবি ও তথ্য এই ডিভাইসে সংরক্ষিত` status দেখলে save শেষ হয়েছে।

## Build ও test

- Website: `npm ci` তারপর `npm run build`
- Extension: `npx vite build --config vite.extension.config.js`; installable folder `outputs/chrome-extension`
- Android: `android/build-local.ps1` ও repository-এর local toolchain, অথবা JDK 17, SDK 35, Gradle 8.11.1। একই private signing key দিয়ে update build করুন।
- Tests: `python -m unittest test_customer_assets -v`; `node --test chrome-extension/model.test.mjs`

APK build/lint, isolated backend tests, browser draft/reload/Clear, extension field order/PDF save/signature refresh পরীক্ষা করা হয়েছে। AI test-এ fixture response ব্যবহৃত হয়েছে; নিজের key দিয়ে live AI call এবং physical Android phone-এ scanner/swipe/download পরীক্ষা করুন।

## Registration submit-এ HTTP 413 / Unexpected token <

Nginx ছোট request API-তে পাঠালেও বড় ছবি-সহ request আটকে HTML 413 response দিতে পারে। সক্রিয় citybank.abmgroup.tech HTTPS server block-এ নিচের directive যোগ করুন (পুরো config প্রতিস্থাপন করবেন না):

```nginx
client_max_body_size 100m;
client_body_timeout 180s;
```

যে location block app-এ proxy করছে, সেখানে দিন:

```nginx
proxy_read_timeout 180s;
proxy_send_timeout 180s;
```

কোনো location-এ আলাদা ছোট client_max_body_size থাকলে সেটিও ঠিক করুন। `sudo nginx -t` সফল হলে `sudo systemctl reload nginx` চালান। Hosting panel থাকলে ওই domain-এর upload/body size limit পরিবর্তন করুন। এটি VPS Nginx-এর পরিবর্তন; শুধু Docker app rebuild বা APK reinstall করলে এই limit বদলাবে না।
