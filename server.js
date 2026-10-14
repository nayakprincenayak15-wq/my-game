const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let db = {
    users: {}, deposits: [], withdrawals: [], bets: [], gameHistory: [],
    manualNextResult: null, manualBigSmall: null,
    settings: { telegram: 'https://t.me/support', announcement: 'Welcome to maan.win!', qrCode: 'https://via.placeholder.com/150' },
    currentPeriod: Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)),
    timer: 30
};

setInterval(() => {
    db.timer--;
    if (db.timer <= 0) {
        db.timer = 30;
        db.currentPeriod++;
        let num = db.manualNextResult !== null ? db.manualNextResult : Math.floor(Math.random() * 10);
        db.manualNextResult = null;
        let bs = num >= 5 ? 'Big' : 'Small';
        if (db.manualBigSmall !== null) { bs = db.manualBigSmall; db.manualBigSmall = null; }
        let col = num === 0 || num === 5 ? 'violet' : num % 2 === 0 ? 'red' : 'green';
        db.gameHistory.unshift({ period: db.currentPeriod - 1, number: num, bigSmall: bs, color: col });
        if (db.gameHistory.length > 50) db.gameHistory.pop();

        db.bets.forEach(b => {
            if (b.period === (db.currentPeriod - 1) && b.status === 'Pending') {
                let win = false;
                if (typeof b.select === 'number' && b.select === num) win = true;
                else if (b.select === 'Big' && bs === 'Big') win = true;
                else if (b.select === 'Small' && bs === 'Small') win = true;
                else if (b.select.toLowerCase() === col) win = true;

                if (win) {
                    b.status = 'Win';
                    if (db.users[b.phone]) {
                        let mult = 2.0; // Default for Big/Small/Colors (10 + 10 = 20 total return)
                        let sel = b.select;
                        if (sel === 0) mult = 10.0;
                        else if (sel === 1) mult = 2.0;
                        else if (sel === 2) mult = 3.0;
                        else if (sel === 3) mult = 4.0;
                        else if (sel === 4) mult = 5.0;
                        else if (sel === 5) mult = 6.0;
                        else if (sel === 6) mult = 7.0;
                        else if (sel === 7) mult = 8.0;
                        else if (sel === 8) mult = 9.0;
                        else if (sel === 9) mult = 10.0;
                        
                        db.users[b.phone].balance += (b.totalAmount * mult);
                    }
                } else {
                    b.status = 'Loss';
                }
            }
        });
        io.emit('game-result', { gameHistory: db.gameHistory });
    }
    io.emit('timer-update', { timer: db.timer, period: db.currentPeriod });
}, 1000);

app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || phone.length !== 10 || !password) return res.json({ success: false, message: 'Enter valid 10-digit phone & password' });
    if (db.users[phone]) return res.json({ success: false, message: 'Phone already registered!' });
    let gameId = 'MW' + Math.floor(100000 + Math.random() * 900000);
    db.users[phone] = { phone, password, gameId, balance: 0 };
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = db.users[phone];
    if (user && user.password === password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid phone or password' });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (!amount || !utr) return res.json({ success: false, message: 'Enter amount and UTR' });
    if (Number(amount) < 100) return res.json({ success: false, message: 'Minimum deposit amount is ₹100' });
    db.deposits.unshift({ id: Date.now(), phone, amount: Number(amount), utr, status: 'Pending' });
    res.json({ success: true, message: 'Deposit request submitted successfully' });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amount, accName, accNo, ifsc, bankName } = req.body;
    const user = db.users[phone];
    if (Number(amount) < 100) return res.json({ success: false, message: 'Minimum withdrawal amount is ₹100' });
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    if (!accName || !accNo || !ifsc || !bankName) return res.json({ success: false, message: 'Fill all bank details' });
    user.balance -= Number(amount);
    db.withdrawals.unshift({ id: Date.now(), phone, amount: Number(amount), bankDetails: { accName, accNo, ifsc, bankName }, status: 'Pending' });
    res.json({ success: true, message: 'Withdrawal request submitted', newBalance: user.balance });
});

app.get('/api/user-data', (req, res) => {
    const p = req.query.phone;
    res.json({ user: db.users[p], deposits: db.deposits.filter(d => d.phone === p), withdrawals: db.withdrawals.filter(w => w.phone === p), bets: db.bets.filter(b => b.phone === p), gameHistory: db.gameHistory, settings: db.settings });
});

app.post('/api/bet', (req, res) => {
    const { phone, select, amount, quantity } = req.body;
    const user = db.users[phone];
    let total = Number(amount) * Number(quantity);
    if (!user || user.balance < total) return res.json({ success: false, message: 'Insufficient balance' });
    user.balance -= total;
    db.bets.unshift({ id: Date.now(), phone, select, amount: Number(amount), quantity: Number(quantity), totalAmount: total, period: db.currentPeriod, status: 'Pending' });
    res.json({ success: true, message: 'Bet placed successfully', newBalance: user.balance });
});

app.get('/api/admin/data', (req, res) => {
    res.json({ onlineCount: Object.keys(db.users).length, deposits: db.deposits, withdrawals: db.withdrawals, bets: db.bets });
});

app.post('/api/admin/approve', (req, res) => {
    const { type, id } = req.body;
    if (type === 'deposit') {
        let d = db.deposits.find(x => x.id == id);
        if (d && d.status === 'Pending') { 
            d.status = 'Approved'; 
            if (db.users[d.phone]) {
                db.users[d.phone].balance += Number(d.amount);
            }
        }
    } else if (type === 'withdraw') {
        let w = db.withdrawals.find(x => x.id == id);
        if (w && w.status === 'Pending') w.status = 'Approved';
    }
    res.json({ success: true });
});

app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>maan.win Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:10px;margin:0;}.box{background:#161b22;padding:10px;margin-bottom:10px;border-radius:8px;border:1px solid #30363d;}h3{color:#58a6ff;margin-top:0;font-size:15px;}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px;}th,td{border:1px solid #30363d;padding:4px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:3px 6px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:10px;}</style></head><body><h3>maan.win Admin Panel</h3><div class="box"><b>Online Users:</b> <span id="onUsers" style="color:#00e676">0</span></div><div class="box"><h3>Deposits</h3><table id="dt"></table></div><div class="box"><h3>Withdrawals</h3><table id="wt"></table></div><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{document.getElementById('onUsers').innerText=d.onlineCount;let dt='<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'deposit\\','+x.id+')">Approve</button>':'<span style="color:#00e676">Approved</span>')+'</td></tr>'});document.getElementById('dt').innerHTML=dt;let wt='<tr><th>Phone</th><th>Amt</th><th>Bank Details</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{let b=x.bankDetails?x.bankDetails.accNo+' ('+x.bankDetails.bankName+')':'--';wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+b+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'withdraw\\','+x.id+')">Approve</button>':'<span style="color:#00e676">Approved</span>')+'</td></tr>'});document.getElementById('wt').innerHTML=wt;});}function ap(t,id){fetch('/api/admin/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,id})}).then(()=>load());}setInterval(load,3000);load();</script></html>`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('Server live on port ' + PORT));
