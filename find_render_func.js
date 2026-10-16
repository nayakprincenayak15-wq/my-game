const fs = require('fs');
if (fs.existsSync('admin.html')) {
    const code = fs.readFileSync('admin.html', 'utf8');
    const index = code.indexOf('withdrawls-list');
    console.log(code.substring(index, index + 800));
}
