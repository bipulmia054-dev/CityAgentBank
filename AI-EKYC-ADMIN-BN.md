# Admin AI eKYC Review

## Operator-configured editable defaults

A–Z খোলার সময় খালি ঘরে ISLAM, S.S.C, SINGLE, same address Yes, Direct Sales Agent, Resident Bangladeshi, PEP/related/IP No, Savings account, yearly 1–5 million ও source YES বসে। এগুলো operator-selected draft defaults, AI verification বা প্রমাণ নয়। ব্যাংকে পাঠানোর আগে গ্রাহক অনুযায়ী মিলিয়ে পরিবর্তন করতে হবে। Existing আলাদা উত্তর ও locks বজায় থাকে। Profession AI/explicit work অনুযায়ী; issue place NID/saved issue place থেকেই। Nominee-এর নিজের English address ভাগ করে বসে, Bengali address AI transliterate করে।

Applications-এ নাম, ID, phone, email ও collector text search status tab-এর সঙ্গে কাজ করে।

Updated autofill: known personal/address values and explicit saved risk answers map into dropdowns immediately. Safe case/spacing differences are normalized. Exact known occupations map to profession/sector/occupation; AI handles supported remaining values. NID address is an editable starting address, not proof that present equals permanent. Unknown risk declarations are not invented. Married drafts save even if spouse name is not yet available.

Admin Applications → A–Z Preview/Edit এবং Records → Full Editor-এ AI review panel আছে।

1. পরিবর্তন Server-এ Saved হওয়া পর্যন্ত অপেক্ষা করুন।
2. একমাত্র “AI দিয়ে পূরণ ও Auto-save” button চাপুন।
3. নির্বাচিত customer-এর NID Front/Back, uploaded Income Declaration image, saved text ও কাজের description Gemini-তে যাবে। Button-এর নিচে এই তথ্য দেওয়া আছে; আলাদা popup নেই। Admin AI Settings-এর key প্রয়োজন।
4. স্পষ্ট, অনুমোদিত ধরনের তথ্য সরাসরি form-এ বসে Auto-save হবে। Tick/Apply/confirmation checkbox নেই। Save status দেখুন; প্রয়োজন হলে নিজে edit করুন। অজানা তথ্য নিজে পূরণ করুন, AI-কে আবার জিজ্ঞাসা করার প্রয়োজন নেই।
5. Personal, Address, Nominee ও Risk sections খোলা থাকবে। আলাদা checklist, AI result, Lock ও History/Undo panel নেই। পূর্বের locked তথ্যের অভ্যন্তরীণ সুরক্ষা বহাল আছে।
6. Risk form-এ customer-specific declaration লিখুন। আলাদা verification checkbox নেই; Chrome extension 2.4.2 saved nonempty উত্তর ব্যবহার করে। PEP/IP, residence, source credibility এবং yearly transactions AI নির্ধারণ করে না। Salary থেকে yearly turnover বানানো হয় না।
7. Server audit history অভ্যন্তরীণভাবে সংরক্ষিত থাকে; actor server নির্ধারণ করে।

## নিরাপত্তা ও সীমা

- শুধু Admin; worker API access নিষিদ্ধ। Current revision না মিললে processing/apply/save বন্ধ।
- NID ছবি readable বলা হলেও AI ভুল করতে পারে। প্রয়োজনে operator সংশোধন করবেন; confidence মানে সত্যতা যাচাই নয়।
- Email না থাকলে খালি। Religion, education, marital status অনুমান নয়। Applicant/Nominee তথ্য মেশানো নয়।
- Missing বা unclear তথ্য বাদ পড়ে। আগে সংরক্ষিত তথ্য মুছে ফেলা হয় না। AI autofill ব্যাংকের compliance approval নয়।
- একই customer-এর simultaneous AI request আটকানো হয়। সর্বোচ্চ ছয় জনের NID; JPG/PNG/WEBP, প্রতিটি সর্বোচ্চ ৮ MB, মোট ২৪ MB।
- Business risk / multiple nominee ব্যাংকের unmapped অংশ manual review প্রয়োজন।
- AI চলাকালে form বদলালে পুরোনো ফল বসানো হয় না।
- NID/identity data Gemini-তে পাঠানোর আগে আপনার প্রতিষ্ঠানের প্রয়োজনীয় customer consent ও processing অনুমতি নিশ্চিত করুন।

Tests-এ mocked Gemini ব্যবহার হয়; কোনো আসল customer-এর NID পাঠানো হয়নি। Live Gemini extraction accuracy এবং bank acceptance আলাদাভাবে operator-কে যাচাই করতে হবে।
