const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Modern replace targeting exact keys used in server.js (holder, acc, ifsc, bank)
html = html.replace(
  /\$\{wd\.bank\s*\|\|\s*"Bank"\}/g,
  '${wd.bank || "Bank"}${wd.holder ? " | Name: " + wd.holder : ""}${wd.acc || wd.account || wd.accountNumber ? " | A/C: " + (wd.acc || wd.account || wd.accountNumber) : ""}${wd.ifsc ? " | IFSC: " + wd.ifsc : ""}'
);

fs.writeFileSync('admin.html', html);
console.log("Updated admin.html with exact server keys!");
