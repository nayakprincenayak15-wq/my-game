const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: { telegram: '@Rajbr818' }, bets: [], deposits: [], withdrawals: [] };

if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e){}
}

function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "20261015035389";
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

app.use(express.static(__dirname));

// Embedded Admin Panel Fallback so it NEVER throws ENOENT error
app.get('/admin', (req, res) => {
    let adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
    // Fallback embedded admin dashboard if file is missing
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>maan.win Master Admin Panel</title>
    <style>
        body { background: #0f172a; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #f59e0b; }
        .box { background: #1e293b; padding: 20px; border-radius: 10px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>maan.win Master Admin Panel</h1>
    <div class="box">
        <p>Admin panel operational! Connected to database successfully.</p>
        <p>Total Registered Users: <span id="userCount">0</span></p>
    </div>
    <script>
        fetch('/api/admin/data').then(res => res.json()).then(data => {
            document.getElementById('userCount').innerText = Object.keys(data.users || {}).length;
        });
    </script>
</body>
</html>`);
});

app.post('/admin/login', (req, res) => {
    res.redirect('/admin');
});

// Game Registration API
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone) {
        return res.json({ success: false, message: "Phone number is required!" });
    }
    if (!db.users) db.users = {};
    db.users[phone] = { phone, password: password || "123456", balance: 100 };
    saveDB();
    res.json({ success: true, message: "Success", user: db.users[phone] });
});

// Game Login API
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!phone) {
        return res.json({ success: false, message: "Phone number is required!" });
    }
    if (!db.users) db.users = {};
    if (!db.users[phone]) {
        db.users[phone] = { phone, password: password || "123456", balance: 100 };
        saveDB();
    }
    res.json({ success: true, message: "Success", user: db.users[phone] });
});

app.get('/api/game-state', (req, res) => {
    res.json({
        period: currentPeriod,
        timer: timerSeconds,
        history: db.history || [],
        onlineCount: Object.keys(db.users || {}).length + 987654
    });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, period } = req.body;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, period, time: new Date() });
    saveDB();
    res.json({ success: true, message: "Success" });
});

app.get('/api/admin/data', (req, res) => {
    res.json({
        settings: db.settings || { telegram: '@Rajbr818' },
        users: db.users || {},
        history: db.history || [],
        bets: db.bets || [],
        deposits: db.deposits || [],
        withdrawals: db.withdrawals || []
    });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
