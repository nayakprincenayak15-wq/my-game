const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let users = {}, deposits = [], withdrawals = [], gameHistory = [], manualNextResult = null;
let currentPeriod = Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14));
let timer = 30;

setInterval(() => {
    timer--;
    if (timer <= 0) {
        timer = 30; currentPeriod++;
        let randomNum = manualNextResult !== null ? manualNextResult : Math.floor(Math.random() * 10);
        manualNextResult = null;
        const bigSmall = randomNum >= 5 ? 'Big' : 'Small';
        let color = (randomNum === 0 || randomNum === 5) ? 'violet' : (randomNum % 2 === 0 ? 'red' : 'green');
        const lastResult = { period: currentPeriod - 1, number: randomNum, bigSmall, color };
        gameHistory.unshift(lastResult);
        if (gameHistory.length > 50) gameHistory.pop();
        io.emit('game-result', { lastResult, gameHistory });
    }
    io.emit('timer-update', { timer, period: currentPeriod });
}, 1000);

app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Invalid data' });
    if (users[phone]) return res.json({ success: false, message: 'User exists' });
    const gameId = 'MW' + Math.floor(100000 + Math.random() * 900000);
    users[phone] = { phone, password, gameId, balance: 0.00 };
    res.json({ success: true, user: users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = users[phone];
    if (user && user.password === password) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (amount < 100 || !utr) return res.json({ success: false, message: 'Invalid Deposit (Min ₹100 & valid UTR)' });
    const deposit = { id: Date.now(), phone, amount: Number(amount), utr, status: 'Pending', date: new Date().toLocaleString() };
    deposits.push(deposit);
    res.json({ success: true, message: 'Deposit request submitted!', deposit });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amount, bankName, holderName, accountNumber, ifscCode } = req.body;
    const user = users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    if (!bankName || !holderName || !accountNumber || !ifscCode) return res.json({ success: false, message: 'Fill complete bank details' });
    user.balance -= Number(amount);
    const withdrawal = { id: Date.now(), phone, amount: Number(amount), bankDetails: { bankName, holderName, accountNumber, ifscCode }, status: 'Pending', date: new Date().toLocaleString() };
    withdrawals.push(withdrawal);
    res.json({ success: true, message: 'Withdrawal request submitted!', withdrawal });
});

app.get('/api/history', (req, res) => {
    res.json({ gameHistory });
});

app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Admin Panel</title><style>body{background:#111;color:#fff;font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:10px;background:#222;}th,td{border:1px solid #444;padding:8px;font-size:12px;}th{color:#ff9800;}.btn{padding:5px 10px;background:#4caf50;color:#fff;border:none;border-radius:4px;cursor:pointer;}</style></head><body><h2>maan.win Admin Panel</h2><div style="background:#222;padding:15px;margin-bottom:15px;"><h3>Set Next Number (0-9)</h3><input type="number" id="num" min="0" max="9"><button onclick="setNum()" class="btn" style="background:#ff9800">Set Result</button></div><h3>Deposits</h3><table id="dep"></table><h3>Withdrawals</h3><table id="wd"></table><script>function load(){fetch('/api/admin/data').then(r=>r.json()).then(d=>{let dp='<tr><th>Phone</th><th>Amount</th><th>UTR</th><th>Action</th></tr>';d.deposits.forEach(x=>{dp+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="apD('+x.id+')">Approve</button>':'Approved')+'</td></tr>'});document.getElementById('dep').innerHTML=dp;let wd='<tr><th>Phone</th><th>Amount</th><th>Bank</th><th>Action</th></tr>';d.withdrawals.forEach(x=>{wd+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.bankDetails.bankName+','+x.bankDetails.accountNumber+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="apW('+x.id+')">Approve</button>':'Approved')+'</td></tr>'});document.getElementById('wd').innerHTML=wd;});}function apD(id){fetch('/api/admin/approve-deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(()=>load());}function apW(id){fetch('/api/admin/approve-withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(()=>load());}function setNum(){const num=document.getElementById('num').value;fetch('/api/admin/set-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num})}).then(r=>r.json()).then(d=>alert(d.message));}setInterval(load,3000);load();</script></body></html>`);
});

app.get('/api/admin/data', (req, res) => res.json({ deposits, withdrawals }));
app.post('/api/admin/approve-deposit', (req, res) => {
    const dep = deposits.find(d => d.id === req.body.id);
    if (dep && dep.status === 'Pending') { dep.status = 'Approved'; if (users[dep.phone]) users[dep.phone].balance += dep.amount; }
    res.json({ success: true });
});
app.post('/api/admin/approve-withdraw', (req, res) => {
    const wd = withdrawals.find(w => w.id === req.body.id);
    if (wd && wd.status === 'Pending') wd.status = 'Approved';
    res.json({ success: true });
});
app.post('/api/admin/set-result', (req, res) => {
    manualNextResult = Number(req.body.num);
    res.json({ success: true, message: 'Next result set to ' + req.body.num });
});

app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif;}body{background:#0b121e;color:#fff;display:flex;justify-content:center;}.app{width:100%;max-width:420px;background:#0f192c;padding:14px;min-height:100vh;}.hdr{display:flex;justify-content:space-between;align-items:center;}.logo{font-size:22px;font-weight:bold;color:#ff9800;}.card{background:#16243d;border-radius:12px;padding:14px;margin-top:12px;}.btn-group{display:flex;gap:10px;margin-top:10px;}.btn{flex:1;padding:10px;border:none;border-radius:8px;font-weight:bold;color:#fff;cursor:pointer;}.btn-dep{background:#4caf50;}.btn-wd{background:#f44336;}.tmr{background:#1a2a47;border-radius:12px;padding:12px;margin-top:12px;text-align:center;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px;}.num{padding:10px;text-align:center;border-radius:50%;font-weight:bold;cursor:pointer;}.bs{display:flex;gap:10px;margin-top:12px;}.btn-b{background:#ff9800;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;}.btn-s{background:#2196f3;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;}table{width:100%;margin-top:15px;font-size:12px;border-collapse:collapse;}th,td{padding:6px;text-align:center;border-bottom:1px solid #1a2a47;}.dot{height:10px;width:10px;border-radius:50%;display:inline-block;}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;}.box{width:90%;max-width:340px;background:#16243d;padding:20px;border-radius:12px;}.inp{width:100%;padding:10px;margin:6px 0;background:#0f192c;border:1px solid #2a3c5e;border-radius:8px;color:#fff;}.btn-o{width:100%;padding:10px;background:#ff9800;border:none;border-radius:8px;color:#fff;font-weight:bold;margin-top:8px;cursor:pointer;}</style></head><body><div id="auth" class="modal"><div class="box" id="lBox"><h2 style="color:#ff9800;text-align:center">maan.win Login</h2><input type="text" id="lPh" class="inp" placeholder="Phone"><input type="password" id="lPw" class="inp" placeholder="Password"><button class="btn-o" onclick="login()">Login</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('r')">Register Now</p></div><div class="box" id="rBox" style="display:none"><h2 style="color:#ff9800;text-align:center">Register</h2><input type="text" id="rPh" class="inp" placeholder="Phone"><input type="password" id="rPw" class="inp" placeholder="Password"><button class="btn-o" onclick="reg()">Register</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('l')">Login Now</p></div></div><div id="depM" class="modal" style="display:none"><div class="box"><h3>Deposit via QR</h3><input type="number" id="dA" class="inp" placeholder="Amount (Min ₹100)"><input type="text" id="dU" class="inp" placeholder="12-digit UTR"><button class="btn-o" onclick="subD()">Submit</button><p style="color:#aaa;text-align:center;margin-top:8px;cursor:pointer" onclick="document.getElementById('depM').style.display='none'">Cancel</p></div></div><div id="wdM" class="modal" style="display:none"><div class="box"><h3>Withdrawal</h3><input type="number" id="wA" class="inp" placeholder="Amount"><input type="text" id="wB" class="inp" placeholder="Bank Name"><input type="text" id="wH" class="inp" placeholder="Holder Name"><input type="text" id="wAc" class="inp" placeholder="Account Number"><input type="text" id="wI" class="inp" placeholder="IFSC"><button class="btn-o" onclick="subW()">Submit</button><p style="color:#aaa;text-align:center;margin-top:8px;cursor:pointer" onclick="document.getElementById('wdM').style.display='none'">Cancel</p></div></div><div class="app"><div class="hdr"><div class="logo">maan.win</div><div><a href="https://t.me/your_support" style="color:#ff9800;text-decoration:none;font-size:12px;">Support</a> <button onclick="logout()" style="background:#f44336;color:#fff;border:none;padding:4px 8px;border-radius:4px;">Logout</button></div></div><div class="card"><div style="font-size:12px;color:#8a9bbd">Wallet Balance (<span id="gId">ID: --</span>)</div><div style="font-size:24px;font-weight:bold">₹<span id="bal">0.00</span></div><div class="btn-group"><button class="btn btn-dep" onclick="document.getElementById('depM').style.display='flex'">Deposit</button><button class="btn btn-wd" onclick="document.getElementById('wdM').style.display='flex'">Withdraw</button></div></div><div class="tmr"><div style="font-size:12px;color:#ffb74d">Period: <span id="prd">--</span></div><div style="font-size:32px;font-weight:bold;color:#00e676" id="tmr">00:30</div></div><div class="bs"><button class="btn-b" onclick="alert('Bet Big')">Big</button><button class="btn-s" onclick="alert('Bet Small')">Small</button></div><div class="grid"><div class="num" style="background:#9c27b0">0</div><div class="num" style="background:#4caf50">1</div><div class="num" style="background:#f44336">2</div><div class="num" style="background:#4caf50">3</div><div class="num" style="background:#f44336">4</div><div class="num" style="background:#9c27b0">5</div><div class="num" style="background:#f44336">6</div><div class="num" style="background:#4caf50">7</div><div class="num" style="background:#f44336">8</div><div class="num" style="background:#4caf50">9</div></div><h4 style="margin-top:15px;color:#ff9800">Game History</h4><table><thead><tr><th>Period</th><th>Number</th><th>Big/Small</th><th>Color</th></tr></thead><tbody id="gh"></tbody></table></div><script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));if(u){document.getElementById('auth').style.display='none';upd();}function toggleAuth(t){document.getElementById('lBox').style.display=t==='l'?'block':'none';document.getElementById('rBox').style.display=t==='r'?'block':'none';}function reg(){const phone=document.getElementById('rPh').value,password=document.getElementById('rPw').value;fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,password})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function login(){const phone=document.getElementById('lPh').value,password=document.getElementById('lPw').value;fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,password})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function logout(){localStorage.removeItem('user');location.reload();}function upd(){if(!u)return;document.getElementById('gId').innerText='ID: '+u.gameId;document.getElementById('bal').innerText=u.balance.toFixed(2);loadH();}socket.on('timer-update',d=>{document.getElementById('tmr').innerText='00:'+(d.timer<10?'0':'')+d.timer;document.getElementById('prd').innerText=d.period;});socket.on('game-result',d=>rGH(d.gameHistory));function subD(){fetch('/api/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:document.getElementById('dA').value,utr:document.getElementById('dU').value})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success)document.getElementById('depM').style.display='none';});}function subW(){fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:document.getElementById('wA').value,bankName:document.getElementById('wB').value,holderName:document.getElementById('wH').value,accountNumber:document.getElementById('wAc').value,ifscCode:document.getElementById('wI').value})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success)document.getElementById('wdM').style.display='none';});}function loadH(){fetch('/api/history').then(r=>r.json()).then(d=>rGH(d.gameHistory));}function rGH(h){let html='';if(h&&h.length>0){h.forEach(x=>{const c=x.color==='green'?'#4caf50':x.color==='red'?'#f44336':'#9c27b0';html+='<tr><td>'+x.period+'</td><td style="font-weight:bold;color:'+c+'">'+x.number+'</td><td>'+x.bigSmall+'</td><td><span class="dot" style="background:'+c+'"></span></td></tr>';});}else html='<tr><td colspan="4">No history</td></tr>';document.getElementById('gh').innerHTML=html;}</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('Server live on port ' + PORT));
