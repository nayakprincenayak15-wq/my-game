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
        telegram: 'https://t.me/support',
        announcement: 'Welcome to maan.win! Play and Win Big!'
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
        if (referrer) { bonus = 10; referrer.balance += 10; referrer.referrals = (referrer.referrals || 0) + 1; }
    }
    db.users[phone] = { phone, password, gameId: 'MW' + Math.floor(100000 + Math.random() * 900000), balance: bonus, referrals: 0 };
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const user = db.users[req.body.phone];
    if (user && user.password === req.body.password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid phone number or password' });
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
    res.json({ user: db.users[phone], deposits: db.deposits.filter(d => d.phone === phone), withdrawals: db.withdrawals.filter(w => w.phone === phone), bets: db.bets.filter(b => b.phone === phone), gameHistory: db.gameHistory, settings: db.settings });
});

app.get('/api/admin/data', (req, res) => {
    res.json({ onlineCount: Object.keys(db.users).length, deposits: db.deposits, withdrawals: db.withdrawals, bets: db.bets });
});

app.post('/api/admin/approve', (req, res) => {
    const { type, id } = req.body;
    if (type === 'deposit') {
        const d = db.deposits.find(x => x.id == id);
        if (d && d.status === 'Pending') { d.status = 'Approved'; if (db.users[d.phone]) db.users[d.phone].balance += Number(d.amount); }
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

app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>maan.win Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:10px;margin:0;}.box{background:#161b22;padding:10px;margin-bottom:10px;border-radius:8px;border:1px solid #30363d;}h3{color:#58a6ff;margin-top:0;font-size:15px;}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px;}th,td{border:1px solid #30363d;padding:4px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:3px 6px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:10px;}.inp{width:100%;padding:6px;margin:4px 0;background:#0d1117;border:1px solid #30363d;color:#fff;border-radius:4px;box-sizing:border-box;font-size:12px;}</style></head><body><h3>maan.win Admin Panel</h3><div class="box"><b>Online Users:</b> <span id="onUsers" style="color:#00e676">0</span></div><div class="box"><h3>Game Control</h3><input type="number" id="nr" class="inp" min="0" max="9" placeholder="Set Number (0-9)"><button class="btn" style="background:#f0883e;" onclick="setRes('num')">Set Number</button><select id="bs" class="inp" style="margin-top:6px;"><option value="Big">Big</option><option value="Small">Small</option></select><button class="btn" style="background:#2196f3;" onclick="setRes('bs')">Set Big/Small</button></div><div class="box"><h3>Deposits</h3><table id="dt"></table></div><div class="box"><h3>Withdrawals</h3><table id="wt"></table></div><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{document.getElementById('onUsers').innerText=d.onlineCount;let dt='<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'deposit\\','+x.id+')">Approve</button>':'Success')+'</td></tr>'});document.getElementById('dt').innerHTML=dt;let wt='<tr><th>Phone</th><th>Amt</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'withdraw\\','+x.id+')">Approve</button>':'Success')+'</td></tr>'});document.getElementById('wt').innerHTML=wt;});}function ap(t,id){fetch('/api/admin/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,id})}).then(()=>load());}function setRes(t){let val=t==='num'?document.getElementById('nr').value:document.getElementById('bs').value;fetch('/api/admin/set-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,val})}).then(r=>r.json()).then(d=>alert(d.message));}setInterval(load,3000);load();</script></body></html>`);
});

app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif;}body{background:#0b121e;color:#fff;display:flex;justify-content:center;}.app{width:100%;max-width:420px;background:#0f192c;padding:12px;min-height:100vh;}.hdr{display:flex;justify-content:space-between;align-items:center;}.logo{font-size:18px;font-weight:bold;color:#ff9800;}.card{background:#16243d;border-radius:10px;padding:10px;margin-top:8px;}.btn{padding:8px;border:none;border-radius:6px;font-weight:bold;color:#fff;cursor:pointer;font-size:12px;}.btn-dep{background:#4caf50;flex:1;}.btn-wd{background:#f44336;flex:1;}.tmr{background:#1a2a47;border-radius:10px;padding:10px;margin-top:8px;text-align:center;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:8px;}.num{padding:8px;text-align:center;border-radius:50%;font-weight:bold;cursor:pointer;color:#fff;font-size:12px;}.colors{display:flex;gap:6px;margin-top:8px;}.btn-c{flex:1;padding:8px;border-radius:6px;border:none;color:#fff;font-weight:bold;cursor:pointer;font-size:12px;}.bs{display:flex;gap:6px;margin-top:8px;}.btn-b{background:#ff9800;flex:1;}.btn-s{background:#2196f3;flex:1;}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(11,18,30,0.95);display:flex;justify-content:center;align-items:center;z-index:100;}.box{width:90%;max-width:320px;background:#16243d;padding:18px;border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,0.5);}.inp{width:100%;padding:10px;margin:6px 0;background:#0f192c;border:1px solid #2a3c5e;border-radius:6px;color:#fff;font-size:12px;box-sizing:border-box;}.btn-o{width:100%;padding:10px;background:linear-gradient(90deg,#ff9800,#f57c00);border:none;border-radius:20px;color:#fff;font-weight:bold;margin-top:10px;cursor:pointer;font-size:13px;}</style></head><body><div id="auth" class="modal"><div class="box" id="rBox"><h3 style="color:#ff9800;text-align:center;margin-bottom:12px;">Register</h3><input type="text" id="rPh" class="inp" placeholder="Phone Number"><input type="password" id="rPw" class="inp" placeholder="Password"><button class="btn-o" onclick="reg()">Register</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer;font-size:11px;" onclick="toggleAuth('l')">Already have an account? Login</p></div><div class="box" id="lBox" style="display:none"><h3 style="color:#ff9800;text-align:center;margin-bottom:12px;">Login</h3><input type="text" id="lPh" class="inp" placeholder="Phone Number"><input type="password" id="lPw" class="inp" placeholder="Password"><button class="btn-o" onclick="login()">Login</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer;font-size:11px;" onclick="toggleAuth('r')">Register</p></div></div><div class="app"><div class="hdr"><div class="logo">maan.win</div><button class="btn" style="background:#f44336;padding:4px 8px;font-size:10px;" onclick="logout()">Logout</button></div><div class="card"><div style="font-size:10px;color:#8a9bbd">Balance (<span id="gId">ID: --</span>)</div><div style="font-size:20px;font-weight:bold">₹<span id="bal">0.00</span></div><div style="display:flex;gap:6px;margin-top:6px;"><button class="btn btn-dep" onclick="openDep()">Deposit</button><button class="btn btn-wd" onclick="openWd()">Withdraw</button></div></div><div class="tmr"><div style="font-size:10px;color:#ffb74d">Period: <span id="prd">--</span></div><div style="font-size:24px;font-weight:bold;color:#00e676" id="tmr">00:30</div></div><div class="colors"><button class="btn-c" style="background:#4caf50;" onclick="openBet('Green')">Green</button><button class="btn-c" style="background:#9c27b0;" onclick="openBet('Violet')">Violet</button><button class="btn-c" style="background:#f44336;" onclick="openBet('Red')">Red</button></div><div class="grid"><div class="num" style="background:#9c27b0" onclick="openBet(0)">0</div><div class="num" style="background:#4caf50" onclick="openBet(1)">1</div><div class="num" style="background:#f44336" onclick="openBet(2)">2</div><div class="num" style="background:#4caf50" onclick="openBet(3)">3</div><div class="num" style="background:#f44336" onclick="openBet(4)">4</div><div class="num" style="background:#9c27b0" onclick="openBet(5)">5</div><div class="num" style="background:#f44336" onclick="openBet(6)">6</div><div class="num" style="background:#4caf50" onclick="openBet(7)">7</div><div class="num" style="background:#f44336" onclick="openBet(8)">8</div><div class="num" style="background:#4caf50" onclick="openBet(9)">9</div></div><div class="bs"><button class="btn btn-b" onclick="openBet('Big')">Big</button><button class="btn btn-s" onclick="openBet('Small')">Small</button></div><div id="historyTable"></div></div><script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));if(u){document.getElementById('auth').style.display='none';upd();}function toggleAuth(t){document.getElementById('rBox').style.display=t==='r'?'block':'none';document.getElementById('lBox').style.display=t==='l'?'block':'none';}function reg(){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('rPh').value,password:document.getElementById('rPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function login(){fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('lPh').value,password:document.getElementById('lPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function logout(){localStorage.removeItem('user');location.reload();}function upd(){if(!u)return;document.getElementById('gId').innerText='ID: '+u.gameId;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}socket.on('timer-update',d=>{document.getElementById('tmr').innerText='00:'+(d.timer<10?'0':'')+d.timer;document.getElementById('prd').innerText=d.period;});socket.on('game-result',()=>loadDat());function openBet(s){let amt=prompt('Enter Bet Amount for '+s,'10');if(!amt)return;fetch('/api/bet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,select:s,amount:amt})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){u.balance=d.newBalance;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}});};function openDep(){let amt=prompt('Enter Deposit Amount:','100');if(!amt)return;let utr=prompt('Enter 12-digit UTR:','');if(!utr)return;fetch('/api/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:amt,utr})}).then(r=>r.json()).then(d=>{alert(d.message);loadDat();});}function openWd(){let amt=prompt('Enter Withdrawal Amount:','200');if(!amt)return;fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:amt})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){u.balance=d.newBalance;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}});};function loadDat(){if(!u)return;fetch('/api/user-data?phone='+u.phone).then(r=>r.json()).then(d=>{if(d.user)u.balance=d.user.balance;document.getElementById('bal').innerText=u.balance.toFixed(2);let h='<table style="width:100%;margin-top:8px;font-size:10px;border-collapse:collapse;"><thead><tr style="color:#ff9800"><th>Period</th><th>Num</th><th>Result</th></tr></thead><tbody>';d.gameHistory.forEach(x=>{let c=x.color==='green'?'#4caf50':x.color==='red'?'#f44336':'#9c27b0';h+='<tr><td style="text-align:center;border-bottom:1px solid #1a2a47">'+x.period+'</td><td style="text-align:center;border-bottom:1px solid #1a2a47;color:'+c+'">'+x.number+'</td><td style="text-align:center;border-bottom:1px solid #1a2a47">'+x.bigSmall+'</td></tr>'});h+='</tbody></table>';document.getElementById('historyTable').innerHTML=h;});}setInterval(load,4000);if(u)loadDat();</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('Server live on port ' + PORT));
