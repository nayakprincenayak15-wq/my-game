const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: {}, bets: [], deposits: [], withdrawals: [] };

if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e){}
}
function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "20261015033733";
let timerSeconds = 30;
setInterval(() => {
    let now = new Date();
    timerSeconds = 30 - (now.getSeconds() % 30);
    let p = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 30).toString().padStart(5, '0');
    currentPeriod = p;
}, 1000);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users) db.users = {};
    if (db.users[phone]) return res.json({ success: false, message: "Phone number already registered!" });
    let customId = "MW" + Math.floor(100000 + Math.random() * 900000);
    db.users[phone] = { phone, password, balance: 100, customId };
    saveDB();
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users || !db.users[phone] || db.users[phone].password !== password) {
        return res.json({ success: false, message: "Invalid phone number or password!" });
    }
    res.json({ success: true, user: db.users[phone] });
});

app.get('/api/game-state', (req, res) => {
    if (!db.history) db.history = [];
    res.json({ period: currentPeriod, timer: timerSeconds, history: db.history });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, multiplier } = req.body;
    if (!db.users[phone] || db.users[phone].balance < amount) return res.json({ success: false, message: "Insufficient balance!" });
    db.users[phone].balance -= amount;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, multiplier, period: currentPeriod, time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed successfully!" });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (!db.deposits) db.deposits = [];
    db.deposits.push({ phone, amount, utr, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Deposit request submitted successfully!" });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amt, bank, holder, acc, ifsc } = req.body;
    if (!db.withdrawals) db.withdrawals = [];
    db.withdrawals.push({ phone, amt, bank, holder, acc, ifsc, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Withdrawal request submitted successfully!" });
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });
