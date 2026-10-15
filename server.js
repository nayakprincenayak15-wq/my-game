const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: { telegram: '@Rajbr818' }, bets: [] };
if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e){}
}
function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "";
let timerSeconds = 30;

setInterval(() => {
    let now = new Date();
    timerSeconds = 30 - (now.getSeconds() % 30);
    let p = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 30).toString().padStart(5, '0');
    currentPeriod = p;
}, 1000);

app.get('/admin-login.html', (req, res) => {
    res.send(`<!DOCTYPE html>
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
</html>`);
});

app.post('/admin/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === 'Prince' && pass === '6396714538') {
        res.cookie('admin_logged', 'true', { maxAge: 86400000, httpOnly: true });
        return res.redirect('/admin');
    }
    return res.send("<script>alert('Wrong Username or Password'); window.location='/admin-login.html';</script>");
});

app.use('/admin', (req, res, next) => {
    if (req.cookies && req.cookies.admin_logged === 'true') {
        return next();
    }
    return res.redirect('/admin-login.html');
});

app.use(express.static(__dirname));

app.get('/api/game-state', (req, res) => {
    res.json({
        period: currentPeriod,
        timer: timerSeconds,
        history: db.history || [],
        onlineCount: Object.keys(db.users || {}).length + 987654
    });
});

app.get('/api/admin/data', (req, res) => {
    res.json({
        settings: db.settings || { telegram: '@Rajbr818' },
        users: db.users || {},
        history: db.history || []
    });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
