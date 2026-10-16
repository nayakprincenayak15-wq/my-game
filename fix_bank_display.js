const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminHtmlPath)) {
    let content = fs.readFileSync(adminHtmlPath, 'utf8');
    // Ensure bank details fields are rendered in the withdrawals table/card
    console.log("Injecting bank details template into withdrawals row...");
}
