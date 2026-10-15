const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    if(!code.includes("cookieParser")) {
        code = "const cookieParser = require('cookie-parser');\n" + code;
        code = code.replace("const app = express();", "const app = express();\napp.use(cookieParser());");
    }

    let loginRouteCode = `
app.get('/admin', (req, res) => {
    if (req.cookies && req.cookies.admin_logged === 'true') {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    res.send(\`<!DOCTYPE html>
    <html>
    <head>
        <title>Admin Login - maan.win</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background: #0d1117; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .box { background: #161b22; padding: 25px; border-radius: 10px; width: 320px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); border: 1px solid #30363d; }
            h2 { text-align: center; color: #58a6ff; margin-bottom: 20px; }
            input { width: 100%; padding: 12px; margin: 8px 0 15px 0; background: #0d1117; border: 1px solid #30363d; color: #fff; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
            button { width: 100%; padding: 12px; background: #238636; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; }
            button:hover { background: #2ea043; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>Admin Login</h2>
            <form method="POST" action="/admin/login">
                <label style="font-size: 13px; color: #8b949e;">Username</label>
                <input type="text" name="user" required placeholder="Enter username">
                <label style="font-size: 13px; color: #8b949e;">Password</label>
                <input type="password" name="pass" required placeholder="Enter password">
                <button type="submit">Login</button>
            </form>
        </div>
    </body>
    </html>\`);
});

app.post('/admin/login', express.urlencoded({ extended: true }), (req, res) => {
    const { user, pass } = req.body;
    if (user === 'Prince' && pass === '6396714538') {
        res.cookie('admin_logged', 'true', { maxAge: 86400000, httpOnly: true });
        return res.redirect('/admin');
    }
    res.send(\`<script>alert('Galat Username ya Password hai!'); window.location='/admin';</script>\`);
});
    `;

    if(code.includes("app.get('/admin'")) {
        let parts = code.split("app.get('/admin'");
        let endIdx = parts[1].indexOf('});');
        if(endIdx !== -1) {
            let endPart = parts[1].substring(endIdx + 3);
            code = parts[0] + loginRouteCode + endPart;
        } else {
            code += loginRouteCode;
        }
    } else {
        code += loginRouteCode;
    }

    fs.writeFileSync(serverPath, code);
    console.log("Custom login page added successfully!");
}
