# Admin AI eKYC Review

Admin Applications → A–Z Preview/Edit এবং Records → Full Editor-এ AI review panel আছে।

1. পরিবর্তন Server-এ Saved হওয়া পর্যন্ত অপেক্ষা করুন।
2. “AI দিয়ে সব তথ্য প্রস্তুত করুন” বা “শুধু খালি ঘর প্রস্তুত করুন” চাপুন।
3. নির্বাচিত customer-এর NID Front/Back, uploaded Income Declaration image, saved text ও কাজের description Gemini-তে যাবে—confirmation দেখে সম্মতি দিন। Admin AI Settings-এর key প্রয়োজন।
4. আগে–পরে তথ্য, উৎস ও supporting text দেখুন। AI নিজে customer-এর তথ্য বদলায় না। প্রয়োজনীয় প্রস্তাব tick করে Apply করুন। Auto-save status দেখুন।
5. বাকি কাজের তালিকা তথ্য পরিবর্তনের সঙ্গে আপডেট হয়। যাচাই করা তথ্য Lock করলে AI Apply ও Undo তা বদলাবে না। হাতে পরিবর্তন করলে আবার যাচাই করুন।
6. Risk form-এ customer-specific declaration নিশ্চিত করুন। PEP/IP, residence, source credibility এবং yearly transactions AI নির্ধারণ করে না। Salary থেকে yearly turnover বানানো হয় না।
7. History-তে সর্বশেষ ২০টি save-এর eKYC text change থাকে; actor server নির্ধারণ করে। Undo কেবল বর্তমান মান এখনও মিলে গেলে এবং unlocked হলে কাজ করে। Image history/restore এই ফিচারের অন্তর্ভুক্ত নয়।

## নিরাপত্তা ও সীমা

- শুধু Admin; worker API access নিষিদ্ধ। Current revision না মিললে processing/apply/save বন্ধ।
- NID ছবি readable বলা হলেও AI ভুল করতে পারে। Operator review আবশ্যক; confidence মানে সত্যতা যাচাই নয়।
- Email না থাকলে খালি। Religion, education, marital status অনুমান নয়। Applicant/Nominee তথ্য মেশানো নয়।
- Missing বা unclear তথ্য বাদ পড়ে। Checklist একটি completeness aid, ব্যাংকের compliance approval নয়।
- একই customer-এর simultaneous AI request আটকানো হয়। সর্বোচ্চ ছয় জনের NID; JPG/PNG/WEBP, প্রতিটি সর্বোচ্চ ৮ MB, মোট ২৪ MB।
- Business risk / multiple nominee ব্যাংকের unmapped অংশ manual review প্রয়োজন।
- AI quality/issues একটি run-এর snapshot; মূল remaining checklist বর্তমান তথ্য থেকে গণনা হয়।
- NID/identity data Gemini-তে পাঠানোর আগে আপনার প্রতিষ্ঠানের প্রয়োজনীয় customer consent ও processing অনুমতি নিশ্চিত করুন।

Tests-এ mocked Gemini ব্যবহার হয়; কোনো আসল customer-এর NID পাঠানো হয়নি। Live Gemini extraction accuracy এবং bank acceptance আলাদাভাবে operator-কে যাচাই করতে হবে।
