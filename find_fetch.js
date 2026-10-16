const fs = require('fs');
if (fs.existsSync('admin.html')) {
    const code = fs.readFileSync('admin.html', 'utf8');
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('withdrawls-list') || line.includes('withdrawals') || line.includes('fetch')) {
            console.log(`Line ${idx + 1}: ${line}`);
        }
    });
}
