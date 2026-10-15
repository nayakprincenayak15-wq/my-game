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

// Admin Login GET Route -> Shows Admin Login Page
app.get('/admin', (req, res) => {
    let adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
    return res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Login POST Route -> Opens Master Admin Dashboard on successful submit
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    let files = fs.readdirSync(__dirname);
    let dashFile = files.find(f => (f.toLowerCase().includes('dashboard') || f.toLowerCase().includes('panel')) && f.endsWith('.html') && f !== 'admin.html');
    if (dashFile) {
        return res.sendFile(path.join(__dirname, dashFile));
    }
    let adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
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
    res.json({ success: true, message: "Registration successful!", user: db.users[phone] });
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
    res.json({ success: true, message: "Login successful!", user: db.users[phone] });
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
