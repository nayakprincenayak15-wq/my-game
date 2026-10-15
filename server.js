const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: { telegram: '@Rajbr818' }, bets: [] };

if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e){}
}

function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

// Real-time 30-Second Game Period Timer Loop
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

app.use(express.static(__dirname));

// Admin Panel Access Route
app.get('/admin', (req, res) => {
    let adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
    return res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Login POST Route (Allows credentials Prince / 6396714538 and direct access)
app.post('/admin/login', (req, res) => {
    let adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
    return res.json({ success: true, redirect: '/admin' });
});

// User Registration API
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users) db.users = {};
    
    // Auto-create/login user if already registered or new
    db.users[phone] = { phone, password, balance: db.users[phone]?.balance || 1000 };
    saveDB();
    
    res.json({ success: true, message: "Registration successful!", user: db.users[phone] });
});

// User Login API
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users) db.users = {};
    
    if (!db.users[phone]) {
        db.users[phone] = { phone, password, balance: 1000 };
        saveDB();
    }
    
    res.json({ success: true, message: "Login successful!", user: db.users[phone] });
});

// Live Game State Sync API
app.get('/api/game-state', (req, res) => {
    res.json({
        period: currentPeriod,
        timer: timerSeconds,
        history: db.history || [],
        onlineCount: Object.keys(db.users || {}).length + 987654
    });
});

// Betting API
app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, period } = req.body;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, period, time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed successfully!" });
});

// Admin Data Management API
app.get('/api/admin/data', (req, res) => {
    res.json({
        settings: db.settings || { telegram: '@Rajbr818' },
        users: db.users || {},
        history: db.history || [],
        bets: db.bets || []
    });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
