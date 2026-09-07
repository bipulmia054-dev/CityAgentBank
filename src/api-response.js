export async function readJson(response) {
  const status = response.status;
  const messages = {
    413: "ছবিসহ ফাইলের আকার সার্ভারের আপলোড সীমা ছাড়িয়েছে। অ্যাডমিনকে সার্ভারের আপলোড সীমা বাড়াতে বলুন।",
    502: "অ্যাপ সার্ভারের সঙ্গে সংযোগ হচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    503: "সার্ভার এখন ব্যস্ত বা সাময়িকভাবে বন্ধ আছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    504: "ছবি প্রক্রিয়াকরণে সার্ভারের নির্ধারিত সময় শেষ হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    401: "আপনার লগইনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।",
    403: "এই কাজটি করার অনুমতি নেই অথবা সার্ভার অনুরোধটি আটকে দিয়েছে।"
  };
  const text = await response.text();
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error(`${messages[status] || "সার্ভার থেকে সঠিক উত্তর পাওয়া যায়নি। অ্যাডমিনকে সার্ভারের API সংযোগ পরীক্ষা করতে বলুন।"} (HTTP ${status})`); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`সার্ভার থেকে অসম্পূর্ণ উত্তর পাওয়া গেছে। (HTTP ${status})`);
  }
  if (!response.ok && !value.error) value.error = `${messages[status] || "অনুরোধটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।"} (HTTP ${status})`;
  return value;
}
