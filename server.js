const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { 
    users: {}, 
    history: [], 
    settings: { telegram: 'https://t.me/support', qr: '', notice: 'Welcome to maan.win!' }, 
    bets: [], 
    deposits: [], 
    withdrawals: [] 
};

if (fs.existsSync(DB_PATH)) {
    try { 
        let loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); 
        db = { ...db, ...loaded };
    } catch(e){}
}

function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "20261015054262";
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

// Serve all static files (HTML, CSS, JS) from project root directory
app.use(express.static(__dirname));

// Admin Route: Serves admin.html if it exists, otherwise falls back to embedded dashboard
app.get('/admin', (req, res) => {
    let adminFile = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminFile)) {
        return res.sendFile(adminFile);
    }
    let files = fs.readdirSync(__dirname);
    let found = files.find(f => (f.toLowerCase().includes('admin') || f.toLowerCase().includes('dash')) && f.endsWith('.html'));
    if (found) {
        return res.sendFile(path.join(__dirname, found));
    }
    return res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/admin/login', (req, res) => {
    res.json({ success: true, redirect: '/admin' });
});

// Full Compatibility Auth APIs for Game Login & Registration
app.post(['/api/register', '/register', '/api/signup'], (req, res) => {
    const { phone, password, invite } = req.body;
    let uPhone = phone || req.body.mobile;
    if (!uPhone) {
        return res.json({ success: false, message: "Phone number is required!" });
    }
    if (!db.users) db.users = {};
    
    if (db.users[uPhone]) {
        return res.json({ success: false, message: "User already exists!" });
    }

    db.users[uPhone] = { 
        phone: uPhone, 
        password: password || "123456", 
        balance: 100, 
        invite: invite || '',
        created: new Date() 
    };
    saveDB();

    res.json({ 
        success: true, 
        code: 200, 
        message: "Registration successful!", 
        token: "token-" + Date.now(),
        user: db.users[uPhone],
        data: db.users[uPhone] 
    });
});

app.post(['/api/login', '/login'], (req, res) => {
    const { phone, password } = req.body;
    let uPhone = phone || req.body.mobile;
    if (!uPhone) {
        return res.json({ success: false, message: "Phone number is required!" });
    }
    if (!db.users) db.users = {};
    
    if (!db.users[uPhone]) {
        // Auto-register if not found to ensure smooth entry
        db.users[uPhone] = { phone: uPhone, password: password || "123456", balance: 100 };
        saveDB();
    }

    res.json({ 
        success: true, 
        code: 200, 
        message: "Login successful!", 
        token: "token-" + Date.now(),
        user: db.users[uPhone],
        data: db.users[uPhone] 
    });
});

app.get('/api/user-data', (req, res) => {
    let phone = req.query.phone || req.query.mobile;
    let user = db.users[phone] || { phone: phone || "9999999999", balance: 100 };
    res.json({ success: true, user: user, balance: user.balance || 100 });
});

app.get('/api/game-state', (req, res) => {
    res.json({
        period: currentPeriod,
        timer: timerSeconds,
        history: db.history || [],
        onlineCount: Object.keys(db.users || {}).length + 1250
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
        settings: db.settings,
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
