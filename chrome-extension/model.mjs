export const DEFAULT_SERVER = 'https://citybank.abmgroup.tech';
export function serverOrigin(input) {
  const url = new URL(input);
  const host = url.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host) && /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith('.ts.net');
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) throw new Error('HTTPS অথবা private LAN/Tailscale server address দিন');
  return url.origin;
}
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
export function personFields(person = {}, fallback = {}) {
  return [
    ['Issue date', text(person.issueDate || person.issue_date)],
    ['Issue place', text(person.issuePlace || person.issue_place)],
    ['ID card number', text(person.nid || fallback.customer_number)],
    ['Name', text(person.name || person.nameBn || fallback.name)],
    ['Date of birth', text(person.dob)],
    ['Email address', text(person.email || fallback.email)],
    ['Phone number', text(person.phone || fallback.phone)],
    ['Profession', text(person.profession)],
    ["Father's name", text(person.fatherNameEn || person.fatherNameBn)],
    ["Mother's name", text(person.motherNameEn || person.motherNameBn)],
    ['Address', text(person.addressEn || person.addressBn)],
    ['Village / area', text(person.village || person.para)],
    ['Post office', text(person.postOffice)],
    ['Post code', text(person.postCode || person.postalCode)],
    ['Thana', text(person.thana)],
    ['District', text(person.district)]
  ];
}
export function casePeople(caseData = {}) {
  const people = Array.isArray(caseData.people) ? caseData.people.filter(p => p && typeof p === 'object') : [];
  const applicantIndex = people.findIndex(p => String(p.role).toLowerCase() === 'applicant');
  const index = applicantIndex < 0 ? 0 : applicantIndex;
  return { applicant: people[index] || {}, nominees: people.filter((p, i) => i !== index) };
}
export function safeImage(value) {
  return typeof value === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value) ? value : '';
}
