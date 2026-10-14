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

        // Process bets
        bets.forEach(b => {
            if (b.period === (currentPeriod - 1) && b.status === 'Pending') {
                let win = false;
                if (typeof b.select === 'number' && b.select === randomNum) win = true;
                else if (b.select === 'Big' && bigSmall === 'Big') win = true;
                else if (b.select === 'Small' && bigSmall === 'Small') win = true;
                else if (b.select.toLowerCase() === color) win = true;

                if (win) {
                    b.status = 'Win';
                    if (users[b.phone]) users[b.phone].balance += (b.amount * 1.9);
                } else {
                    b.status = 'Loss';
                }
            }
        });

        io.emit('game-result', { lastResult, gameHistory });
    }
    io.emit('timer-update', { timer, period: currentPeriod });
}, 1000);

// ADMIN ROUTE
app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>maan.win Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:15px;margin:0;}.box{background:#161b22;padding:12px;margin-bottom:12px;border-radius:8px;border:1px solid #30363d;}h2,h3{color:#58a6ff;margin-top:0;}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}th,td{border:1px solid #30363d;padding:6px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:5px 10px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-weight:bold;}.inp{padding:6px;background:#0d1117;border:1px solid #30363d;color:#fff;border-radius:4px;}</style></head><body><h2>maan.win Admin Panel</h2><div class="box"><h3>Set Next Result (0-9)</h3><input type="number" id="nr" class="inp" min="0" max="9" placeholder="Number (0-9)"><button class="btn" style="background:#f0883e;margin-left:6px;" onclick="setRes()">Set Result</button></div><div class="box"><h3>Deposits Requests</h3><table id="dt"></table></div><div class="box"><h3>Withdrawal Requests</h3><table id="wt"></table></div><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{let dp='<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dp+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="apD('+x.id+')">Approve</button>':x.status)+'</td></tr>'});document.getElementById('dt').innerHTML=dp;let wt='<tr><th>Phone</th><th>Amt</th><th>Bank</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+(x.bankDetails?x.bankDetails.bankName:'--')+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="apW('+x.id+')">Approve</button>':x.status)+'</td></tr>'});document.getElementById('wt').innerHTML=wt;});}function apD(id){fetch('/api/admin/approve-deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(()=>load());}function apW(id){fetch('/api/admin/approve-withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(()=>load());}function setRes(){fetch('/api/admin/set-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num:document.getElementById('nr').value})}).then(r=>r.json()).then(d=>alert(d.message));}setInterval(load,3000);load();</script></body></html>`);
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
    res.json({ success: true, message: 'Next result manually set to ' + req.body.num });
});

// USER APIS
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Fill all details' });
    if (!users[phone]) users[phone] = { phone, password, gameId: 'MW' + Math.floor(100000 + Math.random() * 900000), balance: 0 };
    res.json({ success: true, user: users[phone] });
});
app.post('/api/login', (req, res) => {
    const user = users[req.body.phone];
    if (user && user.password === req.body.password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid Credentials' });
});
app.post('/api/bet', (req, res) => {
    const { phone, select, amount } = req.body;
    const user = users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Low Balance' });
    user.balance -= Number(amount);
    bets.unshift({ id: Date.now(), phone, select, amount: Number(amount), period: currentPeriod, status: 'Pending' });
    res.json({ success: true, message: 'Bet Placed', newBalance: user.balance });
});
app.post('/api/deposit', (req, res) => {
    deposits.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), utr: req.body.utr, status: 'Pending' });
    res.json({ success: true, message: 'Deposit Request Sent' });
});
app.post('/api/withdraw', (req, res) => {
    const user = users[req.body.phone];
    if (!user || user.balance < req.body.amount) return res.json({ success: false, message: 'Low Balance' });
    user.balance -= Number(req.body.amount);
    withdrawals.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), bankDetails: req.body, status: 'Pending' });
    res.json({ success: true, message: 'Withdrawal Request Sent' });
});
app.get('/api/user-data', (req, res) => {
    const phone = req.query.phone;
    res.json({ user: users[phone], deposits: deposits.filter(d => d.phone === phone), withdrawals: withdrawals.filter(w => w.phone === phone), bets: bets.filter(b => b.phone === phone), gameHistory });
});

// HOME GAME PAGE
app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif;}body{background:#0b121e;color:#fff;display:flex;justify-content:center;}.app{width:100%;max-width:420px;background:#0f192c;padding:14px;min-height:100vh;}.hdr{display:flex;justify-content:space-between;align-items:center;}.logo{font-size:22px;font-weight:bold;color:#ff9800;}.card{background:#16243d;border-radius:12px;padding:14px;margin-top:12px;}.btn-group{display:flex;gap:10px;margin-top:10px;}.btn{flex:1;padding:10px;border:none;border-radius:8px;font-weight:bold;color:#fff;cursor:pointer;}.btn-dep{background:#4caf50;}.btn-wd{background:#f44336;}.tmr{background:#1a2a47;border-radius:12px;padding:12px;margin-top:12px;text-align:center;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px;}.num{padding:10px;text-align:center;border-radius:50%;font-weight:bold;cursor:pointer;color:#fff;}.colors{display:flex;gap:8px;margin-top:12px;}.btn-c{flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.bs{display:flex;gap:10px;margin-top:12px;}.btn-b{background:#ff9800;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.btn-s{background:#2196f3;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.tab-bar{display:flex;margin-top:15px;border-bottom:2px solid #1a2a47;}.tab{flex:1;text-align:center;padding:8px;color:#8a9bbd;cursor:pointer;font-size:12px;font-weight:bold;}.tab.active{color:#ff9800;border-bottom:2px solid #ff9800;}table{width:100%;margin-top:10px;font-size:12px;border-collapse:collapse;}th,td{padding:6px;text-align:center;border-bottom:1px solid #1a2a47;}.dot{height:10px;width:10px;border-radius:50%;display:inline-block;}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:100;}.box{width:90%;max-width:340px;background:#16243d;padding:20px;border-radius:12px;}.inp{width:100%;padding:10px;margin:6px 0;background:#0f192c;border:1px solid #2a3c5e;border-radius:8px;color:#fff;}.btn-o{width:100%;padding:10px;background:#ff9800;border:none;border-radius:8px;color:#fff;font-weight:bold;margin-top:8px;cursor:pointer;}</style></head><body><div id="auth" class="modal"><div class="box" id="lBox"><h2 style="color:#ff9800;text-align:center">maan.win Login</h2><input type="text" id="lPh" class="inp" placeholder="Phone Number"><input type="password" id="lPw" class="inp" placeholder="Password"><button class="btn-o" onclick="login()">Login</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('r')">Register Now</p></div><div class="box" id="rBox" style="display:none"><h2 style="color:#ff9800;text-align:center">Register</h2><input type="text" id="rPh" class="inp" placeholder="Phone Number"><input type="password" id="rPw" class="inp" placeholder="Password"><button class="btn-o" onclick="reg()">Register</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('l')">Login Now</p></div></div><div class="app"><div class="hdr"><div class="logo">maan.win</div><button onclick="logout()" style="background:#f44336;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">Logout</button></div><div class="card"><div style="font-size:12px;color:#8a9bbd">Wallet Balance (<span id="gId">ID: --</span>)</div><div style="font-size:24px;font-weight:bold">₹<span id="bal">0.00</span></div></div><div class="tmr"><div style="font-size:12px;color:#ffb74d">Period: <span id="prd">--</span></div><div style="font-size:32px;font-weight:bold;color:#00e676" id="tmr">00:30</div></div><div class="colors"><button class="btn-c" style="background:#4caf50;" onclick="openBet('Green')">Green</button><button class="btn-c" style="background:#9c27b0;" onclick="openBet('Violet')">Violet</button><button class="btn-c" style="background:#f44336;" onclick="openBet('Red')">Red</button></div><div class="grid"><div class="num" style="background:#9c27b0" onclick="openBet(0)">0</div><div class="num" style="background:#4caf50" onclick="openBet(1)">1</div><div class="num" style="background:#f44336" onclick="openBet(2)">2</div><div class="num" style="background:#4caf50" onclick="openBet(3)">3</div><div class="num" style="background:#f44336" onclick="openBet(4)">4</div><div class="num" style="background:#9c27b0" onclick="openBet(5)">5</div><div class="num" style="background:#f44336" onclick="openBet(6)">6</div><div class="num" style="background:#4caf50" onclick="openBet(7)">7</div><div class="num" style="background:#f44336" onclick="openBet(8)">8</div><div class="num" style="background:#4caf50" onclick="openBet(9)">9</div></div><div class="bs"><button class="btn-b" onclick="openBet('Big')">Big</button><button class="btn-s" onclick="openBet('Small')">Small</button></div><div class="tab-bar"><div class="tab active" onclick="swTab(1,this)">History</div></div><div id="tabContent"></div></div><script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));if(u){document.getElementById('auth').style.display='none';upd();}function toggleAuth(t){document.getElementById('lBox').style.display=t==='l'?'block':'none';document.getElementById('rBox').style.display=t==='r'?'block':'none';}function reg(){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('rPh').value,password:document.getElementById('rPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function login(){fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('lPh').value,password:document.getElementById('lPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function logout(){localStorage.removeItem('user');location.reload();}function upd(){if(!u)return;document.getElementById('gId').innerText='ID: '+u.gameId;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}socket.on('timer-update',d=>{document.getElementById('tmr').innerText='00:'+(d.timer<10?'0':'')+d.timer;document.getElementById('prd').innerText=d.period;});socket.on('game-result',()=>loadDat());function openBet(s){let amt=prompt('Enter Bet Amount for '+s, '10');if(!amt)return;fetch('/api/bet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,select:s,amount:amt})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){u.balance=d.newBalance;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}});};function loadDat(){if(!u)return;fetch('/api/user-data?phone='+u.phone).then(r=>r.json()).then(d=>{u.balance=d.user?d.user.balance:u.balance;document.getElementById('bal').innerText=u.balance.toFixed(2);let h='<table><thead><tr><th>Period</th><th>Num</th><th>Big/Small</th><th>Color</th></tr></thead><tbody>';d.gameHistory.forEach(x=>{let c=x.color==='green'?'#4caf50':x.color==='red'?'#f44336':'#9c27b0';h+='<tr><td>'+x.period+'</td><td style="font-weight:bold;color:'+c+'">'+x.number+'</td><td>'+x.bigSmall+'</td><td><span class="dot" style="background:'+c+'"></span></td></tr>';});h+='</tbody></table>';document.getElementById('tabContent').innerHTML=h;});}</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server live on port ' + PORT));
