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

// Route for admin
app.get('/admin', (req, res) => {
    let adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
    let files = fs.readdirSync(__dirname);
    let dashFile = files.find(f => (f.toLowerCase().includes('admin') || f.toLowerCase().includes('dash')) && f.endsWith('.html'));
    if (dashFile) {
        return res.sendFile(path.join(__dirname, dashFile));
    }
    return res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/admin/login', (req, res) => {
    res.json({ success: true, redirect: '/admin' });
});

// Full Compatibility User Auth API (For Game Entry)
app.post(['/api/register', '/register'], (req, res) => {
    const { phone, password } = req.body;
    let userPhone = phone || req.body.mobile || "9999999999";
    if (!db.users) db.users = {};
    
    db.users[userPhone] = { phone: userPhone, password: password || "123456", balance: 100 };
    saveDB();

    res.json({
        code: 0,
        status: 200,
        success: true,
        message: "Registration successful!",
        token: "user-token-" + Date.now(),
        user: db.users[userPhone],
        data: db.users[userPhone]
    });
});

app.post(['/api/login', '/login'], (req, res) => {
    const { phone, password } = req.body;
    let userPhone = phone || req.body.mobile || "9999999999";
    if (!db.users) db.users = {};

    if (!db.users[userPhone]) {
        db.users[userPhone] = { phone: userPhone, password: password || "123456", balance: 100 };
        saveDB();
    }

    res.json({
        code: 0,
        status: 200,
        success: true,
        message: "Login successful!",
        token: "user-token-" + Date.now(),
        user: db.users[userPhone],
        data: db.users[userPhone]
    });
});

app.get('/api/user-data', (req, res) => {
    let phone = req.query.phone || Object.keys(db.users)[0];
    let user = db.users[phone] || { phone: "9999999999", balance: 100 };
    res.json({ success: true, user: user, balance: user.balance || 100 });
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
    res.json({ success: true, message: "Bet placed successfully!" });
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
