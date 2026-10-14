const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database
let users = {};
let deposits = [];
let withdrawals = [];
let gameHistory = [];
let currentPeriod = Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14));
let timer = 30;
let lastResult = { period: currentPeriod, number: 7, bigSmall: 'Big', color: 'green' };

// Game Loop (Runs 24/7 on cloud)
setInterval(() => {
    timer--;
    if (timer <= 0) {
        timer = 30;
        currentPeriod++;
        const randomNum = Math.floor(Math.random() * 10);
        const bigSmall = randomNum >= 5 ? 'Big' : 'Small';
        let color = 'green';
        if (randomNum === 0 || randomNum === 5) color = 'violet';
        else if (randomNum % 2 === 0) color = 'red';

        lastResult = { period: currentPeriod - 1, number: randomNum, bigSmall, color };
        gameHistory.unshift(lastResult);
        if (gameHistory.length > 50) gameHistory.pop();

        io.emit('game-result', lastResult);
    }
    io.emit('timer-update', { timer, period: currentPeriod });
}, 1000);

// API Endpoints
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Invalid data' });
    if (users[phone]) return res.json({ success: false, message: 'User already exists' });

    const gameId = 'MW' + Math.floor(100000 + Math.random() * 900000);
    users[phone] = { phone, password, gameId, balance: 0.00, totalRecharge: 0 };
    res.json({ success: true, user: users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = users[phone];
    if (user && user.password === password) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (amount < 100) return res.json({ success: false, message: 'Minimum deposit is ₹100' });
    const deposit = { id: Date.now(), phone, amount: Number(amount), utr, status: 'Pending', date: new Date().toLocaleString() };
    deposits.push(deposit);
    res.json({ success: true, message: 'Deposit request submitted', deposit });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amount, bankDetails } = req.body;
    const user = users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    
    user.balance -= amount;
    const withdrawal = { id: Date.now(), phone, amount: Number(amount), bankDetails, status: 'Pending', date: new Date().toLocaleString() };
    withdrawals.push(withdrawal);
    res.json({ success: true, message: 'Withdrawal request submitted', withdrawal });
});

app.get('/api/history', (req, res) => {
    const { phone } = req.query;
    const userDeposits = deposits.filter(d => d.phone === phone);
    const userWithdrawals = withdrawals.filter(w => w.phone === phone);
    res.json({ deposits: userDeposits, withdrawals: userWithdrawals, gameHistory });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`24/7 Live Game Server running on port ${PORT}`);
});
