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
app.post('/api/admin/approve', (req, res) => {
    const { type, id } = req.body;
    if (type === 'deposit') {
        let d = db.deposits.find(x => x.id == id);
        if (d && d.status === 'Pending') { d.status = 'Approved'; if (db.users[d.phone]) db.users[d.phone].balance += Number(d.amount); }
    } else if (type === 'withdraw') {
        let w = db.withdrawals.find(x => x.id == id);
        if (w && w.status === 'Pending') w.status = 'Approved';
    }
    res.json({ success: true });
});
app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>maan.win Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:10px;margin:0;}.box{background:#161b22;padding:10px;margin-bottom:10px;border-radius:8px;border:1px solid #30363d;}h3{color:#58a6ff;margin-top:0;font-size:15px;}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px;}th,td{border:1px solid #30363d;padding:4px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:3px 6px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:10px;}</style></head><body><h3>maan.win Admin Panel</h3><div class="box"><b>Online Users:</b> <span id="onUsers" style="color:#00e676">0</span></div><div class="box"><h3>Deposits</h3><table id="dt"></table></div><div class="box"><h3>Withdrawals</h3><table id="wt"></table></div><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{document.getElementById('onUsers').innerText=d.onlineCount;let dt='<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'deposit\\','+x.id+')">Approve</button>':'Success')+'</td></tr>'});document.getElementById('dt').innerHTML=dt;let wt='<tr><th>Phone</th><th>Amt</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'withdraw\\','+x.id+')">Approve</button>':'Success')+'</td></tr>'});document.getElementById('wt').innerHTML=wt;});}function ap(t,id){fetch('/api/admin/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,id})}).then(()=>load());}setInterval(load,3000);load();</script></body></html>`);
});

app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>body{background:#0b121e;color:#fff;font-family:sans-serif;padding:15px;margin:0;}.box{background:#16243d;padding:15px;border-radius:10px;margin-top:10px;}.inp{width:100%;padding:10px;margin:5px 0;background:#0f192c;border:1px solid #2a3c5e;color:#fff;border-radius:5px;box-sizing:border-box;}.btn{width:100%;padding:10px;background:#ff9800;border:none;color:#fff;font-weight:bold;border-radius:5px;cursor:pointer;margin-top:5px;}</style></head><body><div id="auth"><h2 style="color:#ff9800;text-align:center;">maan.win</h2><div class="box"><input type="text" id="ph" class="inp" placeholder="Phone Number"><input type="password" id="pw" class="inp" placeholder="Password"><button class="btn" onclick="reg()">Register</button><button class="btn" style="background:#2196f3;" onclick="login()">Login</button></div></div><div id="app" style="display:none;"><div class="box"><h3>Balance: ₹<span id="bal">0</span></h3><button class="btn" style="background:#4caf50;" onclick="dep()">Deposit 100</button><button class="btn" style="background:#f44336;" onclick="wd()">Withdraw 50</button></div><div class="box"><h3>Timer: <span id="tmr">30</span>s</h3><h4>Game History</h4><div id="hist"></div></div></div><script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));if(u){shApp();}function reg(){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('ph').value,password:document.getElementById('pw').value})}).then(r=>r.json()).then(d=>{alert(d.message||'Done');if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(u));shApp();}}); }function login(){fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('ph').value,password:document.getElementById('pw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(u));shApp();}else alert(d.message);});}function shApp(){document.getElementById('auth').style.display='none';document.getElementById('app').style.display='block';upd();}function upd(){fetch('/api/user-data?phone='+u.phone).then(r=>r.json()).then(d=>{if(d.user)u.balance=d.user.balance;document.getElementById('bal').innerText=u.balance;let h='';d.gameHistory.forEach(x=>{h+=x.period+' - Num: '+x.number+' ('+x.bigSmall+')<br>'});document.getElementById('hist').innerHTML=h;});}function dep(){fetch('/api/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:100,utr:'123456789012'})}).then(r=>r.json()).then(d=>{alert(d.message);upd();});}function wd(){fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:50})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success)u.balance=d.newBalance;upd();});}socket.on('timer-update',d=>{document.getElementById('tmr').innerText=d.timer;});socket.on('game-result',()=>upd());setInterval(upd,4000);</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('Server live on port ' + PORT));
