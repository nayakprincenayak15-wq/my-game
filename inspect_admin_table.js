const fs = require('fs');
if (fs.existsSync('admin.html')) {
    const code = fs.readFileSync('admin.html', 'utf8');
    const match = code.match(/function\s+\w*withdrawal\w*\s*\([\s\S]{1,200}/gi) || code.match(/withdrawals[\s\S]{1,300}/gi);
    console.log("Withdrawals rendering logic found:\n", match ? match[0] : "Not found by regex");
}
