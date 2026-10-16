const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminPath)) {
    let html = fs.readFileSync(adminPath, 'utf8');
    
    // Let's inject a complete block or modify withdrawal display mapping
    // We will ensure w.bank, w.holder, w.acc, w.ifsc are explicitly displayed in the withdrawal card/row
    const targetStr = 'withdrawals';
    if (html.includes(targetStr)) {
        // Let's add a robust patch to display bank details inside the admin panel withdrawal container
        // We will append a script or update innerHTML rendering logic directly
        console.log("Found withdrawals keyword in admin.html");
    }
}
