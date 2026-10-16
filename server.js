const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: { notice: 'Welcome to maan.win!', tg: 'https://t.me/support', qr: '' }, bets: [], deposits: [], withdrawals: [] };

if (fs.existsSync(DB_PATH)) {
    try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }; } catch(e){}
}
function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let forcedNum = null;
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
        
        let winNum = (forcedNum !== null && forcedNum !== undefined) ? forcedNum : Math.floor(Math.random() * 10);
        forcedNum = null; // Reset forced result after applying
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
                        if (db.users[b.phone]) db.users[b.phone].balance += b.winAmt;
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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

app.post('/api/register', (req, res) => {
    const { phone, password, referredBy } = req.body;
    if (!db.users) db.users = {};
    if (db.users[phone]) return res.json({ success: false, message: "Phone number already registered!" });
    let customId = "MW" + Math.floor(100000 + Math.random() * 900000);
    db.users[phone] = { phone, password, balance: 0, customId, referredBy: referredBy || '', totalDeposit: 0, totalWagered: 0, blocked: false };
    saveDB();
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users || !db.users[phone] || db.users[phone].password !== password) {
        return res.json({ success: false, message: "Invalid credentials!" });
    }
    if (db.users[phone].blocked) return res.json({ success: false, message: "Your account is blocked!" });
    res.json({ success: true, user: db.users[phone] });
});

app.get('/api/game-state', (req, res) => {
    let phone = req.query.phone;
    let userBal = db.users[phone] ? db.users[phone].balance : undefined;
    let myBets = (db.bets || []).filter(b => b.phone === phone).reverse();
    res.json({ period: currentPeriod, timer: timerSeconds, history: db.history || [], notice: db.settings.notice, userBalance: userBal, myBets: myBets });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, multiplier } = req.body;
    if (!db.users[phone] || db.users[phone].balance < amount) return res.json({ success: false, message: "Insufficient balance!" });
    db.users[phone].balance -= amount;
    if (db.users[phone].totalWagered === undefined) db.users[phone].totalWagered = 0;
    db.users[phone].totalWagered += Number(amount);
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, multiplier, period: currentPeriod, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed successfully!" });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    let amtNum = Number(amount);
    if (amtNum < 100) return res.json({ success: false, message: "Minimum Deposit is ₹100!" });
    if (!db.deposits) db.deposits = [];
    db.deposits.push({ phone, amount: amtNum, utr, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Deposit request submitted successfully!" });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amt, bank, holder, acc, ifsc } = req.body;
    let wdAmt = Number(amt);
    if (wdAmt < 100) return res.json({ success: false, message: "Minimum Withdrawal is ₹100!" });
    let u = db.users[phone];
    if (!u) return res.json({ success: false, message: "User not found!" });
    let totalDep = u.totalDeposit || 0;
    let totalWag = u.totalWagered || 0;
    if (totalWag < totalDep) return res.json({ success: false, message: `Please complete game play of remaining ₹${totalDep - totalWag} before withdrawal!` });
    if (!db.withdrawals) db.withdrawals = [];
    db.withdrawals.push({ phone, amt: wdAmt, bank, holder, acc, ifsc, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Withdrawal request submitted successfully!" });
});

app.get('/api/user-deposits', (req, res) => {
    let list = (db.deposits || []).filter(d => d.phone === req.query.phone).reverse();
    res.json({ deposits: list });
});

app.get('/api/user-withdrawals', (req, res) => {
    let list = (db.withdrawals || []).filter(w => w.phone === req.query.phone).reverse();
    res.json({ withdrawals: list });
});

// ADMIN APIS
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Prince' && password === '6396714538') {
        res.json({ success: true, key: 'SEC_ADM_8899' });
    } else {
        res.json({ success: false, message: "Invalid Admin Credentials!" });
    }
});

app.get('/api/admin/data', (req, res) => {
    if (req.query.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let uList = Object.values(db.users || {});
    let refList = uList.filter(u => u.referredBy).map(u => ({ referrer: u.referredBy, referred: u.phone }));
    res.json({
        success: true,
        period: currentPeriod,
        timer: timerSeconds,
        onlineUsers: uList.length,
        totalReg: uList.length,
        users: uList,
        deposits: db.deposits || [],
        withdrawals: db.withdrawals || [],
        referrals: refList,
        settings: db.settings || {}
    });
});

app.post('/api/admin/force-result', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    if (req.body.num !== undefined) forcedNum = req.body.num;
    else if (req.body.bs === 'Big') forcedNum = Math.floor(Math.random() * 5) + 5;
    else if (req.body.bs === 'Small') forcedNum = Math.floor(Math.random() * 5);
    res.json({ success: true, message: "Next period result forced successfully!" });
});

app.post('/api/admin/settings', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    if (req.body.notice !== undefined) db.settings.notice = req.body.notice;
    if (req.body.tg !== undefined) db.settings.tg = req.body.tg;
    if (req.body.qr !== undefined) db.settings.qr = req.body.qr;
    saveDB();
    res.json({ success: true });
});

app.post('/api/admin/update-deposit', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let { index, status } = req.body;
    let dep = db.deposits[index];
    if (dep && dep.status === 'Pending') {
        dep.status = status;
        if (status === 'Approved' && db.users[dep.phone]) {
            db.users[dep.phone].balance += Number(dep.amount);
            if (!db.users[dep.phone].totalDeposit) db.users[dep.phone].totalDeposit = 0;
            db.users[dep.phone].totalDeposit += Number(dep.amount);
        }
        saveDB();
    }
    res.json({ success: true, message: "Deposit " + status });
});

app.post('/api/admin/update-withdraw', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let { index, status } = req.body;
    let wd = db.withdrawals[index];
    if (wd && wd.status === 'Pending') {
        wd.status = status;
        saveDB();
    }
    res.json({ success: true, message: "Withdrawal " + status });
});

app.post('/api/admin/toggle-block', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let u = db.users[req.body.phone];
    if (u) { u.blocked = !u.blocked; saveDB(); }
    res.json({ success: true, message: "User status updated" });
});

app.post('/api/admin/change-pass', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let u = db.users[req.body.phone];
    if (u) { u.password = req.body.newPass; saveDB(); }
    res.json({ success: true, message: "Password updated successfully" });
});

app.post('/api/admin/give-bonus', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let u = db.users[req.body.phone];
    if (u) { u.balance += Number(req.body.bonus); saveDB(); }
    res.json({ success: true, message: "Bonus credited successfully" });
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });
