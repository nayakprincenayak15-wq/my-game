const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    // Ensure cookie parser
    if (!code.includes("cookieParser")) {
        code = "const cookieParser = require('cookie-parser');\n" + code;
        code = code.replace("const app = express();", "const app = express();\napp.use(cookieParser());");
    }

    // Direct Login Guard for Admin
    let authCheck = `
app.use('/admin', (req, res, next) => {
    if (req.path === '/login') return next();
    if (req.cookies && req.cookies.admin_logged === 'true') {
        return next();
    }
    return res.redirect('/admin-login.html');
});
    `;

    if (!code.includes('/admin-login.html')) {
        code = code.replace("app.use(express.static", authCheck + "\napp.use(express.static");
    }

    // Login Form Route
    let loginRoutes = `
app.post('/admin/login', express.urlencoded({ extended: true }), (req, res) => {
    const { user, pass } = req.body;
    if (user === 'Prince' && pass === '6396714538') {
        res.cookie('admin_logged', 'true', { maxAge: 86400000, httpOnly: true });
        return res.redirect('/admin');
    }
    return res.send("<script>alert('Wrong Username or Password'); window.location='/admin-login.html';</script>");
});
    `;

    if (!code.includes('/admin/login')) {
        code += loginRoutes;
    }

    fs.writeFileSync(serverPath, code);
    console.log("Server login guard updated!");
}

// Create standalone admin-login.html page
let loginHtml = `<!DOCTYPE html>
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
    </style>
</head>
<body>
    <div class="box">
        <h2>Admin Login</h2>
        <form method="POST" action="/admin/login">
            <label style="font-size: 13px; color: #8b949e;">Username</label>
            <input type="text" name="user" required placeholder="Username">
            <label style="font-size: 13px; color: #8b949e;">Password</label>
            <input type="password" name="pass" required placeholder="Password">
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'admin-login.html'), loginHtml);
console.log("admin-login.html created!");
