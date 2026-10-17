const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Target the exact line found in line 257
const oldLine = 'html += `<div><div style="font-size:11px;"> - ₹${wd.amt} (${wd.bank || "Bank"}) -> <b style="color:${wd.status==="Approved"?"#22c55e":"#ef4444"}">${wd.status}</b></div>`;';

const newLine = 'html += `<div><div style="font-size:11px;"> - ₹${wd.amt} (${wd.bank || "Bank"}${wd.holder ? " | Name: " + wd.holder : ""}${wd.account || wd.accountNumber ? " | A/C: " + (wd.account || wd.accountNumber) : ""}${wd.ifsc ? " | IFSC: " + wd.ifsc : ""}) -> <b style="color:${wd.status==="Approved"?"#22c55e":"#ef4444"}">${wd.status}</b></div>`;';

if (html.includes('wd.bank || "Bank"')) {
  // Regex replacement for flexibility
  html = html.replace(/html\s*\+=\s*`<div><div style="font-size:11px;">\s*-\s*₹\$\{wd\.amt\}\s*\(\$\{wd\.bank\s*\|\|\s*"Bank"\}\)\s*->[\s\S]*?<\/div>`;/g, newLine);
  fs.writeFileSync('admin.html', html);
  console.log("Exact A-Z search rendering updated successfully!");
} else {
  console.log("Line pattern not matched, attempting fallback replace...");
  html = html.replace(/\$\{wd\.bank\s*\|\|\s*"Bank"\}/g, '${wd.bank \vert{}\vert{} "Bank"}${wd.holder ? " | Name: " + wd.holder : ""}${wd.account \vert{}\vert{} wd.accountNumber ? " \vert{} A/C: " + (wd.account \vert{}\vert{} wd.accountNumber) : ""}${wd.ifsc ? " | IFSC: " + wd.ifsc : ""}');
  fs.writeFileSync('admin.html', html);
  console.log("Fallback replacement done!");
}
