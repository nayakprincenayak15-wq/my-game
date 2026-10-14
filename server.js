const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
let db = {
    users: {},
    deposits: [],
    withdrawals: [],
    bets: [],
    gameHistory: [],
    manualNextResult: null,
    manualBigSmall: null,
    settings: {
        qrCode: '',
        telegram: 'https://t.me/support',
        announcement: 'Welcome to maan.win! Play and Win Big!',
        minDepositForWithdraw: 100
    },
    currentPeriod: Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)),
    timer: 30
};

setInterval(() => {
    db.timer--;
    if (db.timer <= 0) {
        db.timer = 30;
        db.currentPeriod++;
        let randomNum = db.manualNextResult !== null ? db.manualNextResult : Math.floor(Math.random() * 10);
        db.manualNextResult = null;

        let bigSmall = randomNum >= 5 ? 'Big' : 'Small';
        if (db.manualBigSmall !== null) { bigSmall = db.manualBigSmall; db.manualBigSmall = null; }

        let color = 'green';
        if (randomNum === 0 || randomNum === 5) color = 'violet';
        else if (randomNum % 2 === 0) color = 'red';

        const lastResult = { period: db.currentPeriod - 1, number: randomNum, bigSmall, color };
        db.gameHistory.unshift(lastResult);
        if (db.gameHistory.length > 50) db.gameHistory.pop();

        db.bets.forEach(b => {
            if (b.period === (db.currentPeriod - 1) && b.status === 'Pending') {
                let win = false;
                if (typeof b.select === 'number' && b.select === randomNum) win = true;
                else if (b.select === 'Big' && bigSmall === 'Big') win = true;
                else if (b.select === 'Small' && bigSmall === 'Small') win = true;
                else if (b.select.toLowerCase() === color) win = true;

                if (win) {
                    b.status = 'Win';
                    if (db.users[b.phone]) db.users[b.phone].balance += (b.amount * 1.9);
                } else {
                    b.status = 'Loss';
                }
            }
        });
        io.emit('game-result', { lastResult, gameHistory: db.gameHistory });
    }
    io.emit('timer-update', { timer: db.timer, period: db.currentPeriod });
}, 1000);
app.post('/api/register', (req, res) => {
    const { phone, password, ref } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Fill all details' });
    if (db.users[phone]) return res.json({ success: false, message: 'Phone number already registered!' });
    
    let bonus = 0;
    if (ref) {
        let referrer = Object.values(db.users).find(u => u.gameId === ref || u.phone === ref);
        if (referrer) {
            bonus = 10;
            referrer.balance += 10;
            referrer.referrals = (referrer.referrals || 0) + 1;
        }
    }
    db.users[phone] = { 
        phone, 
        password, 
        gameId: 'MW' + Math.floor(100000 + Math.random() * 900000), 
        balance: bonus, 
        referrals: 0 
    };
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const user = db.users[req.body.phone];
    if (user && user.password === req.body.password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid phone number or password' });
});

app.post('/api/forgot', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users[phone]) return res.json({ success: false, message: 'Phone number not found' });
    db.users[phone].password = password;
    res.json({ success: true, message: 'Password reset successful' });
});

app.post('/api/bet', (req, res) => {
    const { phone, select, amount } = req.body;
    const user = db.users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    user.balance -= Number(amount);
    db.bets.unshift({ id: Date.now(), phone, select, amount: Number(amount), period: db.currentPeriod, status: 'Pending' });
    res.json({ success: true, message: 'Bet placed successfully', newBalance: user.balance });
});

app.post('/api/deposit', (req, res) => {
    db.deposits.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), utr: req.body.utr, status: 'Pending' });
    res.json({ success: true, message: 'Deposit request submitted' });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amount, accName, accNo, ifsc, bankName } = req.body;
    const user = db.users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    user.balance -= Number(amount);
    db.withdrawals.unshift({ id: Date.now(), phone, amount: Number(amount), bankDetails: { accName, accNo, ifsc, bankName }, status: 'Pending' });
    res.json({ success: true, message: 'Withdrawal request submitted', newBalance: user.balance });
});

app.get('/api/user-data', (req, res) => {
    const phone = req.query.phone;
    res.json({ 
        user: db.users[phone], 
        deposits: db.deposits.filter(d => d.phone === phone), 
        withdrawals: db.withdrawals.filter(w => w.phone === phone), 
        bets: db.bets.filter(b => b.phone === phone), 
        gameHistory: db.gameHistory, 
        settings: db.settings 
    });
});

app.get('/api/admin/data', (req, res) => {
    res.json({ onlineCount: Object.keys(db.users).length, deposits: db.deposits, withdrawals: db.withdrawals, bets: db.bets });
});

app.post('/api/admin/approve', (req, res) => {
    const { type, id } = req.body;
    if (type === 'deposit') {
        const d = db.deposits.find(x => x.id == id);
        if (d && d.status === 'Pending') { 
            d.status = 'Approved'; 
            if (db.users[d.phone]) db.users[d.phone].balance += Number(d.amount); 
        }
    } else if (type === 'withdraw') {
        const w = db.withdrawals.find(x => x.id == id);
        if (w && w.status === 'Pending') w.status = 'Approved';
    }
    res.json({ success: true });
});

app.post('/api/admin/set-result', (req, res) => {
    if (req.body.type === 'num') db.manualNextResult = Number(req.body.val);
    else db.manualBigSmall = req.body.val;
    res.json({ success: true, message: 'Result updated successfully' });
});

app.post('/api/admin/settings', (req, res) => {
    if (req.body.type === 'ann') db.settings.announcement = req.body.val;
    else db.settings.telegram = req.body.val;
    res.json({ success: true, message: 'Settings updated' });
});
