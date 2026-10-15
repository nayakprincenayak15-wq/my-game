const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    let strictAuthFunc = `
function checkAdminAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="maan.win Master Admin Panel"');
        return res.status(401).send('Authentication required.');
    }
    try {
        const buf = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
        const [user, pass] = buf.split(':');
        if (user === 'Prince' && pass === '6396714538') {
            return next();
        }
    } catch(e){}
    res.setHeader('WWW-Authenticate', 'Basic realm="maan.win Master Admin Panel"');
    return res.status(401).send('Invalid credentials.');
}
    `;

    // Replace existing checkAdminAuth or append it before app.get('/admin'...)
    if (code.includes('function checkAdminAuth')) {
        let parts = code.split('function checkAdminAuth');
        let afterPart = parts[1].substring(parts[1].indexOf('app.get(\'/admin\''));
        code = parts[0] + strictAuthFunc + '\n' + afterPart;
    } else {
        code = code.replace("app.get('/admin'", strictAuthFunc + "\napp.get('/admin'");
    }

    fs.writeFileSync(serverPath, code);
    console.log("Strict admin login auth applied!");
}
