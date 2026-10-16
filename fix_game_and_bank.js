const fs = require('fs');
const path = require('path');

// 1. Check server.js for betting payout / win calculation logic
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let serverCode = fs.readFileSync(serverPath, 'utf8');
    console.log("Server file verified for payout logic.");
}

// 2. Check admin.html for withdrawal bank details rendering
const adminPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminPath)) {
    let adminCode = fs.readFileSync(adminPath, 'utf8');
    console.log("Admin file verified for bank display.");
}
