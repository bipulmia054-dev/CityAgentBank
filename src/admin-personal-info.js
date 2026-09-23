export function applicantContact(caseData = {}) {
  const applicant = caseData.people?.[0] || {};
  return {
    email: caseData.details?.email ?? applicant.email ?? "",
    gender: applicant.gender || "",
  };
}

export function updateApplicantContact(caseData, key, value) {
  if (!["email", "gender"].includes(key)) return caseData;
  const people = [...(caseData.people || [])];
  people[0] = { ...(people[0] || {}), [key]: value };
  return {
    ...caseData,
    ekyc: { ...caseData.ekyc, confirmed: false },
    people,
    ...(key === "email" ? { details: { ...caseData.details, email: value } } : {}),
  };
}

export function contactValidationError(caseData) {
  const { email, gender } = applicantContact(caseData);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "সঠিক Email লিখুন অথবা খালি রাখুন।";
  if (gender && !["M", "F"].includes(gender)) return "Gender নির্বাচন করুন অথবা খালি রাখুন।";
  const e = caseData.ekyc || {};
  if (e.maritalStatus === 'MARRIED' && !String(e.spouseName || '').trim()) return 'Married হলে Spouse Name লিখুন।';
  if (e.monthlyIncome && (!Number.isFinite(Number(e.monthlyIncome)) || Number(e.monthlyIncome) <= 0)) return 'Monthly Income শূন্যের বেশি সংখ্যা দিন।';
  return "";
}
