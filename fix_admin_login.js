const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    // Add Basic Auth or Login check for admin route if not present
    let oldAdminRoute = `app.get('/admin', (req, res) => {`;
    let securedAdminRoute = `
// Admin Login Protection middleware
function checkAdminAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication required.');
    }
    const buf = Buffer.from(auth.split(' ')[1], 'base64').toString().ascii ? Buffer.from(auth.split(' ')[1], 'base64').toString() : Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = buf.split(':');
    if (user === 'Prince' && pass === '6396714538') {
        return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Invalid credentials.');
}

app.get('/admin', checkAdminAuth, (req, res) => {
    `;

    if (code.includes(oldAdminRoute) && !code.includes('checkAdminAuth')) {
        code = code.replace(oldAdminRoute, securedAdminRoute);
        fs.writeFileSync(serverPath, code);
        console.log("Admin login protection added successfully!");
    }
}
