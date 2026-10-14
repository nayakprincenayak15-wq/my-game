const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
let db = {
    users: {}, deposits: [], withdrawals: [], bets: [], gameHistory: [],
    manualNextResult: null, manualBigSmall: null, manualColor: null,
    settings: { qrCode: '', telegram: 'https://t.me/support', announcement: 'Welcome to maan.win!', minDepositForWithdraw: 100 },
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
        if (db.manualColor !== null) { color = db.manualColor; db.manualColor = null; }

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
app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>maan.win Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:12px;margin:0;}.box{background:#161b22;padding:10px;margin-bottom:10px;border-radius:8px;border:1px solid #30363d;}h2,h3{color:#58a6ff;margin-top:0;font-size:16px;}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;}th,td{border:1px solid #30363d;padding:5px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:4px 8px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-weight:bold;font-size:11px;}.inp{width:100%;padding:6px;margin:4px 0;background:#0d1117;border:1px solid #30363d;color:#fff;border-radius:4px;box-sizing:border-box;}</style></head><body><h2>maan.win Admin Panel</h2><div class="box"><h3>Live Stats</h3><p>Online Users: <span id="onUsers" style="color:#00e676;font-weight:bold;">0</span></p></div><div class="box"><h3>Game Control</h3><input type="number" id="nr" class="inp" min="0" max="9" placeholder="Set Number (0-9)"><button class="btn" style="background:#f0883e;" onclick="setRes('num')">Set Number</button><select id="bs" class="inp" style="margin-top:6px;"><option value="Big">Big</option><option value="Small">Small</option></select><button class="btn" style="background:#2196f3;" onclick="setRes('bs')">Set Big/Small</button></div><div class="box"><h3>Settings & Broadcast</h3><input type="text" id="ann" class="inp" placeholder="Announcement"><button class="btn" onclick="saveSt('ann')">Update Announcement</button><input type="text" id="tg" class="inp" style="margin-top:6px;" placeholder="Telegram Link"><button class="btn" onclick="saveSt('tg')">Update Telegram</button></div><div class="box"><h3>Live Bets</h3><table id="bt"></table></div><div class="box"><h3>Deposits</h3><table id="dt"></table></div><div class="box"><h3>Withdrawals</h3><table id="wt"></table></div><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{document.getElementById('onUsers').innerText=d.onlineCount;let dt='<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'deposit\\',\\'+x.id+'\\)">Approve</button>':'<span style="color:#00e676">Success</span>')+'</td></tr>'});document.getElementById('dt').innerHTML=dt;let wt='<tr><th>Phone</th><th>Amt</th><th>Bank</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+(x.bankDetails?x.bankDetails.bankName:'--')+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'withdraw\\',\\'+x.id+'\\)">Approve</button>':'<span style="color:#00e676">Success</span>')+'</td></tr>'});document.getElementById('wt').innerHTML=wt;let bt='<tr><th>Phone</th><th>Select</th><th>Amt</th><th>Status</th></tr>';d.bets.forEach(x=>{bt+='<tr><td>'+x.phone+'</td><td>'+x.select+'</td><td>₹'+x.amount+'</td><td>'+x.status+'</td></tr>'});document.getElementById('bt').innerHTML=bt;});}function ap(t,id){fetch('/api/admin/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,id})}).then(()=>load());}function setRes(t){let val=t==='num'?document.getElementById('nr').value:document.getElementById('bs').value;fetch('/api/admin/set-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,val})}).then(r=>r.json()).then(d=>alert(d.message));}function saveSt(t){let val=t==='ann'?document.getElementById('ann').value:document.getElementById('tg').value;fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,val})}).then(r=>r.json()).then(d=>alert(d.message));}setInterval(load,3000);load();</script></body></html>`);
});
app.post('/api/register', (req, res) => {
    const { phone, password, ref } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Fill all details' });
    if (db.users[phone]) return res.json({ success: false, message: 'Phone number already registered!' });
    let bonus = 0;
    if (ref && db.users[ref]) { bonus = 10; db.users[ref].balance += 10; }
    db.users[phone] = { phone, password, gameId: 'MW' + Math.floor(100000 + Math.random() * 900000), balance: bonus };
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const user = db.users[req.body.phone];
    if (user && user.password === req.body.password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid credentials' });
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
    const user = db.users[req.body.phone];
    if (!user || user.balance < req.body.amount) return res.json({ success: false, message: 'Low balance' });
    user.balance -= Number(req.body.amount);
    db.withdrawals.unshift({ id: Date.now(), phone: req.body.phone, amount: Number(req.body.amount), bankDetails: req.body, status: 'Pending' });
    res.json({ success: true, message: 'Withdrawal request submitted' });
});

app.get('/api/user-data', (req, res) => {
    const phone = req.query.phone;
    res.json({ user: db.users[phone], deposits: db.deposits.filter(d => d.phone === phone), withdrawals: db.withdrawals.filter(w => w.phone === phone), bets: db.bets.filter(b => b.phone === phone), gameHistory: db.gameHistory, settings: db.settings });
});
app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif;}body{background:#0b121e;color:#fff;display:flex;justify-content:center;}.app{width:100%;max-width:420px;background:#0f192c;padding:14px;min-height:100vh;}.hdr{display:flex;justify-content:space-between;align-items:center;}.logo{font-size:20px;font-weight:bold;color:#ff9800;}.card{background:#16243d;border-radius:12px;padding:12px;margin-top:10px;}.btn-group{display:flex;gap:10px;margin-top:10px;}.btn{flex:1;padding:10px;border:none;border-radius:8px;font-weight:bold;color:#fff;cursor:pointer;}.btn-dep{background:#4caf50;}.btn-wd{background:#f44336;}.tmr{background:#1a2a47;border-radius:12px;padding:12px;margin-top:10px;text-align:center;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px;}.num{padding:10px;text-align:center;border-radius:50%;font-weight:bold;cursor:pointer;color:#fff;}.colors{display:flex;gap:8px;margin-top:10px;}.btn-c{flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.bs{display:flex;gap:10px;margin-top:10px;}.btn-b{background:#ff9800;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.btn-s{background:#2196f3;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}table{width:100%;margin-top:10px;font-size:11px;border-collapse:collapse;}th,td{padding:6px;text-align:center;border-bottom:1px solid #1a2a47;}.dot{height:8px;width:8px;border-radius:50%;display:inline-block;}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:100;}.box{width:90%;max-width:340px;background:#16243d;padding:20px;border-radius:12px;}.inp{width:100%;padding:10px;margin:6px 0;background:#0f192c;border:1px solid #2a3c5e;border-radius:8px;color:#fff;font-size:13px;}.btn-o{width:100%;padding:10px;background:#ff9800;border:none;border-radius:8px;color:#fff;font-weight:bold;margin-top:8px;cursor:pointer;}</style></head><body><div id="auth" class="modal"><div class="box" id="lBox"><h2 style="color:#ff9800;text-align:center;margin-bottom:10px">maan.win Login</h2><input type="text" id="lPh" class="inp" placeholder="Phone Number"><input type="password" id="lPw" class="inp" placeholder="Password"><button class="btn-o" onclick="login()">Login</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer;font-size:12px;" onclick="toggleAuth('r')">Register Now</p></div><div class="box" id="rBox" style="display:none"><h2 style="color:#ff9800;text-align:center;margin-bottom:10px">Register</h2><input type="text" id="rPh" class="inp" placeholder="Phone Number"><input type="password" id="rPw" class="inp" placeholder="Password"><input type="text" id="rRef" class="inp" placeholder="Invite Code (Optional)"><button class="btn-o" onclick="reg()">Register</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer;font-size:12px;" onclick="toggleAuth('l')">Login Now</p></div></div><div class="app"><div class="hdr"><div class="logo">maan.win</div><button onclick="logout()" style="background:#f44336;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Logout</button></div><div id="annBox" style="background:#ff9800;color:#000;padding:8px;border-radius:6px;font-size:11px;margin-top:8px;font-weight:bold;"></div><div class="card"><div style="font-size:11px;color:#8a9bbd">Wallet Balance (<span id="gId">ID: --</span>)</div><div style="font-size:22px;font-weight:bold">₹<span id="bal">0.00</span></div><div class="btn-group"><button class="btn btn-dep" onclick="openDep()">Deposit</button><button class="btn btn-wd" onclick="openWd()">Withdraw</button></div></div><div class="tmr"><div style="font-size:11px;color:#ffb74d">Period: <span id="prd">--</span></div><div style="font-size:28px;font-weight:bold;color:#00e676" id="tmr">00:30</div></div><div class="colors"><button class="btn-c" style="background:#4caf50;" onclick="openBet('Green')">Green</button><button class="btn-c" style="background:#9c27b0;" onclick="openBet('Violet')">Violet</button><button class="btn-c" style="background:#f44336;" onclick="openBet('Red')">Red</button></div><div class="grid"><div class="num" style="background:#9c27b0" onclick="openBet(0)">0</div><div class="num" style="background:#4caf50" onclick="openBet(1)">1</div><div class="num" style="background:#f44336" onclick="openBet(2)">2</div><div class="num" style="background:#4caf50" onclick="openBet(3)">3</div><div class="num" style="background:#f44336" onclick="openBet(4)">4</div><div class="num" style="background:#9c27b0" onclick="openBet(5)">5</div><div class="num" style="background:#f44336" onclick="openBet(6)">6</div><div class="num" style="background:#4caf50" onclick="openBet(7)">7</div><div class="num" style="background:#f44336" onclick="openBet(8)">8</div><div class="num" style="background:#4caf50" onclick="openBet(9)">9</div></div><div class="bs"><button class="btn-b" onclick="openBet('Big')">Big</button><button class="btn-s" onclick="openBet('Small')">Small</button></div><div id="historyTable"></div><div id="myBetsTable"></div></div>
res.send(`<script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));if(u){document.getElementById('auth').style.display='none';upd();}function toggleAuth(t){document.getElementById('lBox').style.display=t==='l'?'block':'none';document.getElementById('rBox').style.display=t==='r'?'block':'none';}function reg(){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('rPh').value,password:document.getElementById('rPw').value,ref:document.getElementById('rRef').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function login(){fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('lPh').value,password:document.getElementById('lPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function logout(){localStorage.removeItem('user');location.reload();}function upd(){if(!u)return;document.getElementById('gId').innerText='ID: '+u.gameId;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}socket.on('timer-update',d=>{document.getElementById('tmr').innerText='00:'+(d.timer<10?'0':'')+d.timer;document.getElementById('prd').innerText=d.period;});socket.on('game-result',()=>loadDat());function openBet(s){let amt=prompt('Enter Bet Amount for '+s, '10');if(!amt)return;fetch('/api/bet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,select:s,amount:amt})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){u.balance=d.newBalance;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}});};function openDep(){let amt=prompt('Enter Deposit Amount:','100');if(!amt)return;let utr=prompt('Enter 12-digit UTR/Reference No:','');if(!utr)return;fetch('/api/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:amt,utr})}).then(r=>r.json()).then(d=>{alert(d.message);loadDat();});}function openWd(){let amt=prompt('Enter Withdrawal Amount:','200');if(!amt)return;let bankName=prompt('Enter Bank Name:','');let accNo=prompt('Enter Account Number:','');let ifsc=prompt('Enter IFSC Code:','');fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:amt,bankName,accNo,ifsc})}).then(r=>r.json()).then(d=>{alert(d.message);loadDat();});}function loadDat(){if(!u)return;fetch('/api/user-data?phone='+u.phone).then(r=>r.json()).then(d=>{if(d.user)u.balance=d.user.balance;document.getElementById('bal').innerText=u.balance.toFixed(2);document.getElementById('annBox').innerText=d.settings.announcement;let h='<table style="width:100%;margin-top:10px;font-size:11px;border-collapse:collapse;"><thead><tr style="color:#ff9800"><th style="padding:6px;border-bottom:1px solid #1a2a47">Period</th><th style="padding:6px;border-bottom:1px solid #1a2a47">Num</th><th style="padding:6px;border-bottom:1px solid #1a2a47">Result</th></tr></thead><tbody>';d.gameHistory.forEach(x=>{let c=x.color==='green'?'#4caf50':x.color==='red'?'#f44336':'#9c27b0';h+='<tr><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">'+x.period+'</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47;font-weight:bold;color:'+c+'">'+x.number+'</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">'+x.bigSmall+'</td></tr>'});h+='</tbody></table>';document.getElementById('historyTable').innerHTML=h;let mb='<table style="width:100%;margin-top:10px;font-size:11px;border-collapse:collapse;"><thead><tr style="color:#ff9800"><th style="padding:6px;border-bottom:1px solid #1a2a47">Type</th><th style="padding:6px;border-bottom:1px solid #1a2a47">Amt</th><th style="padding:6px;border-bottom:1px solid #1a2a47">Status</th></tr></thead><tbody>';d.bets.forEach(x=>{mb+='<tr><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">'+x.select+'</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">₹'+x.amount+'</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47;color:'+(x.status==='Win'?'#00e676':x.status==='Loss'?'#f44336':'#ff9800')+';font-weight:bold;">'+x.status+'</td></tr>'});d.deposits.forEach(x=>{mb+='<tr><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">Deposit</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">₹'+x.amount+'</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47;color:'+(x.status==='Approved'?'#00e676':'#f44336')+';font-weight:bold;">'+x.status+'</td></tr>'});d.withdrawals.forEach(x=>{mb+='<tr><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">Withdraw</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47">₹'+x.amount+'</td><td style="padding:6px;text-align:center;border-bottom:1px solid #1a2a47;color:'+(x.status==='Approved'?'#00e676':'#f44336')+';font-weight:bold;">'+x.status+'</td></tr>'});mb+='</tbody></table>';document.getElementById('myBetsTable').innerHTML=mb;});}setInterval(load,4000);if(u)loadDat();</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server live on port ' + PORT));
