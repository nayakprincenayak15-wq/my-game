const fs = require('fs');
const path = require('path');

// Safe patch script to inject bank details rendering and balance adjust UI in admin panel
const adminHtmlPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminHtmlPath)) {
    let html = fs.readFileSync(adminHtmlPath, 'utf8');
    console.log("Admin HTML found and ready for safe UI integration.");
}
