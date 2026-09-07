import {jsPDF} from "jspdf";
const image = src => new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
export async function declarationCanvas(applicant, declaration, signature, templateUrl = "/income-declaration-page1.png") {
  await document.fonts.load('24px "Noto Sans Bengali"');
  await document.fonts.ready;
  const template = await image(templateUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 1190;
  canvas.height = 1684;
  const g = canvas.getContext("2d");
  g.drawImage(template, 0, 0, canvas.width, canvas.height);
  g.fillStyle = "#111";
  g.textBaseline = "middle";
  const write = (value, x, y, maxWidth, size = 24) => {
    if (!value) return;
    g.font = `${size}px "Noto Sans Bengali", "Nirmala UI", sans-serif`;
    g.fillText(value, x, y, maxWidth);
  };
  const addressLines = String(applicant.addressBn || "").split(/\n+/);
  const first = (addressLines[0] || "").split(",").map((v) => v.trim());
  const second = (addressLines[1] || "").split(",").map((v) => v.trim());
  write(
    declaration.customerName || applicant.nameBn || applicant.name,
    210,
    250,
    820,
  );
  write(declaration.fatherName || applicant.fatherNameBn, 210, 305, 820);
  write(declaration.motherName || applicant.motherNameBn, 210, 360, 820);
  write(declaration.address || first[0] || applicant.addressBn, 225, 415, 800);
  write(declaration.postOffice || first.slice(1).join(", "), 255, 470, 255, 20);
  write(declaration.thana || second[0], 760, 470, 275, 20);
  write(declaration.district || second[1] || second[0], 225, 524, 500, 21);
  const description =
    declaration.polishedDescription || declaration.rawDescription;
  const words = String(description || "").split(/\s+/);
  let lines = [], lineHeight = 38;
  for (let size = 23; size >= 16; size--) {
    g.font = `${size}px "Noto Sans Bengali", "Nirmala UI", sans-serif`;
    lines = []; let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (g.measureText(test).width > 900 && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    lineHeight = size + 12;
    if ((lines.length - 1) * lineHeight <= 235) break;
  }
  if ((lines.length - 1) * lineHeight > 235) throw new Error("Description এই ফর্মের জন্য বড়। সংক্ষিপ্ত করে আবার PDF তৈরি করুন।");
  lines.forEach((line, index) => g.fillText(line, 145, 735 + index * lineHeight, 900));
  write(declaration.monthlyIncome, 430, 1051, 160, 23);
  write(declaration.accountNumber, 785, 1267, 260, 21);
  if (signature) {
    const sign = await image(signature);
    g.drawImage(sign, 145, 1145, 330, 100);
  }
  return canvas;
}
export async function declarationPdf(applicant, declaration, signature, templateUrl) {
  const canvas = await declarationCanvas(applicant, declaration, signature, templateUrl);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297);
  return pdf.output("blob");
}
