const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: { notice: 'Welcome to maan.win! Best Color Prediction Platform.' }, bets: [], deposits: [], withdrawals: [] };

if (fs.existsSync(DB_PATH)) {
    try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }; } catch(e){}
}
function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "20261016000522";
let timerSeconds = 30;

setInterval(() => {
    let now = new Date();
    let seconds = now.getSeconds();
    timerSeconds = 30 - (seconds % 30);
    
    let p = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + seconds) / 30).toString().padStart(6, '0');
    
    if (currentPeriod !== p) {
        let activePeriod = currentPeriod;
        currentPeriod = p;
        
        let winNum = Math.floor(Math.random() * 10);
        let winResult = winNum >= 5 ? "Big" : "Small";
        
        if (!db.history) db.history = [];
        db.history.unshift({ period: activePeriod, num: winNum, result: winResult });

        if (db.bets) {
            db.bets.forEach(b => {
                if (b.period === activePeriod && b.status === 'Pending') {
                    let isWin = false;
                    let mult = b.multiplier || 1;

                    if (b.choice === 'Green' && (winNum % 2 !== 0 && winNum !== 5)) isWin = true;
                    else if (b.choice === 'Red' && (winNum % 2 === 0 && winNum !== 0)) isWin = true;
                    else if (b.choice === 'Violet' && (winNum === 0 || winNum === 5)) isWin = true;
                    else if (b.choice === 'Big' && winResult === 'Big') isWin = true;
                    else if (b.choice === 'Small' && winResult === 'Small') isWin = true;
                    else if (b.choice === winNum.toString()) isWin = true;

                    if (isWin) {
                        b.status = 'Win';
                        b.winAmt = b.amount * mult;
                        if (db.users[b.phone]) {
                            db.users[b.phone].balance += b.winAmt;
                        }
                    } else {
                        b.status = 'Loss';
                        b.winAmt = 0;
                    }
                }
            });
        }
        saveDB();
    }
}, 1000);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/register', (req, res) => {
    const { phone, password, referredBy } = req.body;
    if (!db.users) db.users = {};
    if (db.users[phone]) return res.json({ success: false, message: "Phone number already registered!" });
    
    let customId = "MW" + Math.floor(100000 + Math.random() * 900000);
    db.users[phone] = { phone, password, balance: 100, customId, referredBy: referredBy || '' };
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
    let phone = req.query.phone;
    let userBal = db.users[phone] ? db.users[phone].balance : undefined;
    let myBets = (db.bets || []).filter(b => b.phone === phone).reverse();
    
    res.json({ 
        period: currentPeriod, 
        timer: timerSeconds, 
        history: db.history, 
        notice: db.settings.notice,
        userBalance: userBal,
        myBets: myBets
    });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, multiplier } = req.body;
    if (!db.users[phone] || db.users[phone].balance < amount) return res.json({ success: false, message: "Insufficient balance!" });
    db.users[phone].balance -= amount;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, multiplier, period: currentPeriod, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed successfully!" });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (amount < 100) return res.json({ success: false, message: "Minimum Deposit is ₹100!" });
    if (!db.deposits) db.deposits = [];
    db.deposits.push({ phone, amount, utr, status: 'Pending', time: new Date() });
    
    let user = db.users[phone];
    if (user && user.referredBy) {
        let userDeps = db.deposits.filter(d => d.phone === phone && d.status === 'Approved');
        if (userDeps.length === 0 && db.users[user.referredBy]) {
            let bonus = amount * 0.10;
            db.users[user.referredBy].balance += bonus;
        }
    }
    saveDB();
    res.json({ success: true, message: "Deposit request submitted successfully!" });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amt, bank, holder, acc, ifsc } = req.body;
    if (amt < 100) return res.json({ success: false, message: "Minimum Withdrawal is ₹100!" });
    if (!db.withdrawals) db.withdrawals = [];
    db.withdrawals.push({ phone, amt, bank, holder, acc, ifsc, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Withdrawal request submitted successfully!" });
});

app.get('/api/user-deposits', (req, res) => {
    let phone = req.query.phone;
    let list = (db.deposits || []).filter(d => d.phone === phone).reverse();
    res.json({ deposits: list });
});

app.get('/api/user-withdrawals', (req, res) => {
    let phone = req.query.phone;
    let list = (db.withdrawals || []).filter(w => w.phone === phone).reverse();
    res.json({ withdrawals: list });
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });
