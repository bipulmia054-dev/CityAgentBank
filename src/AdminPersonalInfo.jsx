import React from "react";
import AdminEkycFields from './AdminEkycFields.jsx';
import { applicantContact, updateApplicantContact } from "./admin-personal-info.js";

export default function AdminPersonalInfo({ caseData, onChange }) {
  const { email, gender } = applicantContact(caseData);
  const update = (key, value) => onChange(updateApplicantContact(caseData, key, value));
  return <><section className="reviewPerson">
    <h2>Applicant Email ও Gender</h2>
    <p>গ্রাহকের নিশ্চিত তথ্য লিখুন। পরিবর্তন Auto-save হবে; Save status দেখুন।</p>
    <div className="reviewFields">
      <label><span>Email</span><input type="email" autoComplete="off" value={email}
        placeholder="গ্রাহকের Email (না থাকলে খালি রাখুন)"
        onChange={event => update("email", event.target.value.trim())} /></label>
      <label><span>Gender</span><select value={gender} onChange={event => update("gender", event.target.value)}>
        <option value="">নির্বাচন করুন</option>
        <option value="M">Male</option>
        <option value="F">Female</option>
      </select></label>
    </div>
  </section><AdminEkycFields caseData={caseData} onChange={onChange}/></>;
}
