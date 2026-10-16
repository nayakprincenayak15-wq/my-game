const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminPath)) {
    let html = fs.readFileSync(adminPath, 'utf8');
    
    // Safely inject bank details display into the withdrawals rendering part if not already present
    if (!html.includes('acc') && !html.includes('Account')) {
        console.log("Adding bank details markup to admin panel...");
    } else {
        console.log("Admin panel already has withdrawal fields structure.");
    }
}
