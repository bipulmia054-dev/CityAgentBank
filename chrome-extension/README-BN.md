# Chrome Extension 2.0

স্থায়ী server: https://citybank.abmgroup.tech। আগে server package upload ও Python backend চালু করুন।

1. ZIP extract করুন।
2. Chrome-এ chrome://extensions খুলে Developer mode চালু করুন।
3. Load unpacked চাপুন; manifest.json থাকা extracted folder নির্বাচন করুন।
4. Toolbar icon pin করে খুলুন; side panel খোলা থাকবে।
5. Admin/master admin/subadmin account দিয়ে login করুন। Password extension-এ save হয় না।

NID/phone/name/email/serial দিয়ে search করুন। Applicant-এর issue date/place, ID number, name, DOB, front/back download, email/phone, profession, parents ও বিস্তারিত address দেখাবে। এরপর Nominee details ও photo/front/back download থাকবে। Missing তথ্য অনুমান করা হয় না।

Income Declaration details edit করে AI দিয়ে Recreate চাপুন। Server-এর Gemini key দিয়ে description সাজবে; preview review করে Details থেকে PDF Save & Download চাপুন। AI ছাড়াও edited details থেকে PDF তৈরি হয়। Saved PDF Download আগের saved PDF দেয়।

Admin → Customer Files → number search → Upload Signature Card দিয়ে scan/crop confirm করুন। খোলা extension প্রতি ৫ seconds-এ update পরীক্ষা করে card এবং Download button দেখাবে। একই file অন্য জায়গায় edit হলে Save conflict দেখাবে; Search result থেকে file আবার খুলুন।

Install করার জন্য bundled ZIP ব্যবহার করুন, source folder নয়। Chrome 141+ প্রয়োজন। Chrome Web Store-এ প্রকাশিত নয়। Customer data অন্য webpage-এ পাঠানো হয় না; AI Recreate কেবল configured server API ব্যবহার করে।
