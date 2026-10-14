const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let db = {
    users: {}, deposits: [], withdrawals: [], bets: [], gameHistory: [],
    manualNextResult: null, manualBigSmall: null,
    settings: { telegram: 'https://t.me/support', announcement: 'Welcome to maan.win!' },
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
        io.emit('game-result', { gameHistory: db.gameHistory });
    }
    io.emit('timer-update', { timer: db.timer, period: db.currentPeriod });
}, 1000);

app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Fill all details' });
    if (db.users[phone]) return res.json({ success: false, message: 'Already registered!' });
    db.users[phone] = { phone, password, gameId: 'MW' + Math.floor(100000 + Math.random() * 900000), balance: 0 };
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const user = db.users[req.body.phone];
    if (user && user.password === req.body.password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/deposit', (req, res) => {
    db.deposits.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), utr: '123456789012', status: 'Pending' });
    res.json({ success: true, message: 'Deposit submitted' });
});

app.post('/api/withdraw', (req, res) => {
    let u = db.users[req.body.phone];
    if (!u || u.balance < req.body.amount) return res.json({ success: false, message: 'Low balance' });
    u.balance -= Number(req.body.amount);
    db.withdrawals.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), status: 'Pending' });
    res.json({ success: true, message: 'Withdrawal submitted', newBalance: u.balance });
});

app.get('/api/user-data', (req, res) => {
    let p = req.query.phone;
    res.json({ user: db.users[p], gameHistory: db.gameHistory });
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>body{background:#0b121e;color:#fff;font-family:sans-serif;padding:15px;margin:0;}.box{background:#16243d;padding:15px;border-radius:10px;margin-top:10px;}.inp{width:100%;padding:10px;margin:5px 0;background:#0f192c;border:1px solid #2a3c5e;color:#fff;border-radius:5px;box-sizing:border-box;}.btn{width:100%;padding:10px;background:#ff9800;border:none;color:#fff;font-weight:bold;border-radius:5px;cursor:pointer;margin-top:5px;}</style></head><body><div id="auth"><h2 style="color:#ff9800;text-align:center;">maan.win</h2><div class="box"><input type="text" id="ph" class="inp" placeholder="Phone"><input type="password" id="pw" class="inp" placeholder="Password"><button class="btn" onclick="reg()">Register</button><button class="btn" style="background:#2196f3;" onclick="login()">Login</button></div></div><div id="app" style="display:none;"><div class="box"><h3>Balance: ₹<span id="bal">0</span></h3><button class="btn" style="background:#4caf50;" onclick="dep()">Deposit 100</button></div><div class="box"><h3>Timer: <span id="tmr">30</span>s</h3></div></div><script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));if(u)sh();function reg(){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:ph.value,password:pw.value})}).then(r=>r.json()).then(d=>{alert(d.message||'Done');if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(u));sh();}});}function login(){fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:ph.value,password:pw.value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(u));sh();}else alert(d.message);});}function sh(){auth.style.display='none';app.style.display='block';upd();}function upd(){fetch('/api/user-data?phone='+u.phone).then(r=>r.json()).then(d=>{if(d.user)bal.innerText=d.user.balance;});}function dep(){fetch('/api/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:100})}).then(r=>r.json()).then(d=>{alert(d.message);upd();});}socket.on('timer-update',d=>{tmr.innerText=d.timer;});</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('Server live on port ' + PORT));
