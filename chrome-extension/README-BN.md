# Chrome Extension 2.4.0 — eKYC Autofill

## নতুন Auto Fill ব্যবহার

1. Website update deploy করার পরে Admin → Applications → A–Z Preview & Edit খুলুন। Email/Gender, Religion, Education, Single/Married, Married হলে Spouse Name, bank profession/sector, monthly income, English address ও nominee relation/address পূরণ করে Admin Edit Save করুন। Risk answers যাচাই করে confirmation tick দিন। কোনো তথ্য default হিসেবে সত্য ধরা হয় না।
2. নতুন ZIP extract করে Chrome Extensions-এ ওই `chrome-extension` folder Load unpacked করুন। পুরোনো folder ব্যবহার করলে নতুন ফাইল সেখানে বসিয়ে Reload করুন। Version 2.4.0 নিশ্চিত করুন। Bank domain-এর নতুন permission Chrome চাইলে নিজে review/allow করুন।
3. Extension install/update-এর পরে নতুন bank session শুরু করার আগে bank tab refresh করুন। অসমাপ্ত account form refresh করবেন না। Login/mobile/OTP নিজে দিন।
4. Extension panel-এ customer বেছে bank onboarding tab active রেখে Start Auto Fill চাপুন এবং customer/destination নিশ্চিত করুন। শুরুতে সর্বশেষ saved record, Signature Card ও re-uploaded Income Declaration আনা হয়।
5. Mapped page-এ গেলে fields নিজে পূরণ হবে: Upload NID → Dedupe → Personal Information → Nominee → Signature → Risk Grading → Source of Fund। Nominee Verify নিজে করার পরে images/share/relation/address ভরবে। NID front/back-এ existing extension seal থাকে; prepared JPG files 200,000 bytes-এর কম।
6. Login, OTP, fingerprint, actual live photo, FATCA, Verify, Next, terms এবং final account opening manual। System কোনো screening override বা final risk/eligibility সিদ্ধান্ত নেয় না।
7. Pause/Resume/Stop আছে। Missing/unmapped তথ্য status-এ দেখাবে। Save বদলালে Stop করে আবার Start করুন; full page reload হলে আবার Start প্রয়োজন। Start-এর পরে manual edit আর overwrite হয় না। Customer বদলালে আগের run থামে।

### সীমাবদ্ধতা ও যাচাই

- এই release এক applicant + এক adult NID nominee flow-এর observed mapping ব্যবহার করে। Multiple nominee/minor/birth-certificate এবং unmapped business occupation manually review/fill করতে হবে।
- Bank option/selector বদলালে guess না করে status দেখাবে। Spouse field ও আলাদা permanent address অতিরিক্ত conditional mapping; প্রথম Married/different-address live case-এ মিলিয়ে নিন।
- Date DD/MM/YYYY। Bank backend/readonly fields নিজে পরিবর্তন করা হয় না। Source of Fund-এ শুধু admin-uploaded Income Declaration; missing বা multi-page document হলে operator action দরকার।
- Customer data শুধু selected bank tab-এর memory-তে থাকে, disk/storage-এ autofill session লেখা হয় না। Stop/reload-এ session data মুছে যায়।
- Unit/integration tests ও local Admin form পরীক্ষা করা হয়েছে; এই packaged extension দিয়ে নতুন live account-এর end-to-end acceptance test এখনো বাকি। প্রথম run supervisedভাবে করুন।

## আগের search ও document সুবিধা

স্থায়ী server: https://citybank.abmgroup.tech। আগে server package upload ও Python backend চালু করুন।

1. ZIP extract করুন।
2. Chrome-এ chrome://extensions খুলে Developer mode চালু করুন।
3. Load unpacked চাপুন; manifest.json থাকা extracted folder নির্বাচন করুন।
4. Toolbar icon pin করে খুলুন; side panel খোলা থাকবে।
5. Admin/master admin/subadmin account দিয়ে login করুন। Password extension-এ save হয় না।

NID/phone/name/email/serial দিয়ে search করুন। Applicant-এর issue date/place, ID number, name, DOB, front/back download, email/phone, profession, parents ও বিস্তারিত address দেখাবে। Applicant NID Front ও Back-এর পাশে নির্ধারিত Agent User ID seal নিচ থেকে ওপরের দিকে vertical ভাবে থাকবে। এরপর Nominee details ও photo/front/back download থাকবে। Missing তথ্য অনুমান করা হয় না।

Income Declaration details edit করে AI দিয়ে Recreate চাপুন। Server-এর Gemini key দিয়ে description সাজবে; preview review করে Details থেকে PDF Save & Download চাপুন। AI ছাড়াও edited details থেকে PDF তৈরি হয়। Saved PDF Download আগের saved PDF দেয়।

Admin → Customer Files → number search → Upload Signature Card দিয়ে scan/crop confirm করুন। খোলা extension প্রতি ৫ seconds-এ update পরীক্ষা করে card এবং Download button দেখাবে। একই file অন্য জায়গায় edit হলে Save conflict দেখাবে; Search result থেকে file আবার খুলুন।

Install করার জন্য bundled ZIP ব্যবহার করুন, source folder নয়। Chrome 141+ প্রয়োজন। Chrome Web Store-এ প্রকাশিত নয়। Auto Fill-এ সম্মতি দিলে selected customer data কেবল City Bank onboarding-এ পাঠানো হয়; AI Recreate configured server API ব্যবহার করে।
