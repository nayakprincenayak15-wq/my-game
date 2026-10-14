const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let users = {};
let deposits = [];
let withdrawals = [];
let gameHistory = [];
let bets = [];
let manualNextResult = null;
let currentPeriod = Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14));
let timer = 30;

setInterval(() => {
    timer--;
    if (timer <= 0) {
        timer = 30;
        currentPeriod++;
        let randomNum = manualNextResult !== null ? manualNextResult : Math.floor(Math.random() * 10);
        manualNextResult = null;

        const bigSmall = randomNum >= 5 ? 'Big' : 'Small';
        let color = 'green';
        if (randomNum === 0 || randomNum === 5) color = 'violet';
        else if (randomNum % 2 === 0) color = 'red';

        const lastResult = { period: currentPeriod - 1, number: randomNum, bigSmall, color };
        gameHistory.unshift(lastResult);
        if (gameHistory.length > 50) gameHistory.pop();
        io.emit('game-result', { lastResult, gameHistory });
    }
    io.emit('timer-update', { timer, period: currentPeriod });
}, 1000);

// Admin Route
app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Admin Panel</title><style>body{background:#111;color:#fff;font-family:sans-serif;padding:15px;}.box{background:#222;padding:10px;margin-bottom:10px;border-radius:6px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #444;padding:6px;}th{color:#ff9800;}.btn{padding:4px 8px;background:#4caf50;color:#fff;border:none;cursor:pointer;border-radius:4px;}</style></head><body><h2>maan.win Admin</h2><div class="box"><h3>Set Next Result (0-9)</h3><input type="number" id="nr" min="0" max="9"><button class="btn" style="background:#ff9800;" onclick="setRes()">Set</button></div><div class="box"><h3>Deposits</h3><table id="dt"></table></div><div class="box"><h3>Withdrawals</h3><table id="wt"></table></div><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{let dp='<tr><th>Phone</th><th>Amount</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dp+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="apD('+x.id+')">Approve</button>':'Approved')+'</td></tr>'});document.getElementById('dt').innerHTML=dp;let wt='<tr><th>Phone</th><th>Amount</th><th>Bank</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.bankDetails.bankName+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="apW('+x.id+')">Approve</button>':'Success')+'</td></tr>'});document.getElementById('wt').innerHTML=wt;});}function apD(id){fetch('/api/admin/approve-deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(()=>load());}function apW(id){fetch('/api/admin/approve-withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(()=>load());}function setRes(){fetch('/api/admin/set-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num:document.getElementById('nr').value})}).then(r=>r.json()).then(d=>alert(d.message));}setInterval(load,3000);load();</script></body></html>`);
});

app.get('/api/admin/data', (req, res) => res.json({ deposits, withdrawals }));
app.post('/api/admin/approve-deposit', (req, res) => {
    const d = deposits.find(x => x.id === req.body.id);
    if (d && d.status === 'Pending') { d.status = 'Approved'; if (users[d.phone]) users[d.phone].balance += d.amount; }
    res.json({ success: true });
});
app.post('/api/admin/approve-withdraw', (req, res) => {
    const w = withdrawals.find(x => x.id === req.body.id);
    if (w && w.status === 'Pending') w.status = 'Approved';
    res.json({ success: true });
});
app.post('/api/admin/set-result', (req, res) => {
    manualNextResult = Number(req.body.num);
    res.json({ success: true, message: 'Next result set to ' + req.body.num });
});

// APIs
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!users[phone]) users[phone] = { phone, password, gameId: 'MW' + Math.floor(100000 + Math.random() * 900000), balance: 0 };
    res.json({ success: true, user: users[phone] });
});
app.post('/api/login', (req, res) => {
    const user = users[req.body.phone];
    if (user && user.password === req.body.password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid credentials' });
});
app.post('/api/deposit', (req, res) => {
    deposits.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), utr: req.body.utr, status: 'Pending' });
    res.json({ success: true, message: 'Submitted' });
});
app.post('/api/withdraw', (req, res) => {
    withdrawals.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), bankDetails: req.body, status: 'Pending' });
    res.json({ success: true, message: 'Submitted' });
});
app.get('/api/user-data', (req, res) => {
    const phone = req.query.phone;
    res.json({ user: users[phone], deposits: deposits.filter(d => d.phone === phone), withdrawals: withdrawals.filter(w => w.phone === phone), gameHistory });
});

app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>maan.win</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><script src="/socket.io/socket.io.js"></script><style>body{background:#0b121e;color:#fff;font-family:sans-serif;padding:20px;text-align:center;}</style></head><body><h2>maan.win Live Game</h2><p>Server is running successfully!</p></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server live on port ' + PORT));
