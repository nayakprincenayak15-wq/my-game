const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    // Simulate 10 Lakh+ online traffic count safely without crashing memory
    let oldOnline = `onlineCount: Object.keys(db.users).length,`;
    let newOnline = `onlineCount: Object.keys(db.users).length + 987654,`;

    if(code.includes(oldOnline) && !code.includes('987654')){
        code = code.replace(oldOnline, newOnline);
        fs.writeFileSync(serverPath, code);
        console.log("10 Lakh online traffic simulation added successfully!");
    }
}
