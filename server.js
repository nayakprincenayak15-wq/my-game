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

        bets.forEach(b => {
            if (b.period === lastResult.period && b.status === 'Pending') {
                let win = false;
                if (typeof b.select === 'number' && b.select === lastResult.number) win = true;
                else if (b.select === 'Green' && (lastResult.color === 'green' || lastResult.number === 5)) win = true;
                else if (b.select === 'Red' && (lastResult.color === 'red' || lastResult.number === 0)) win = true;
                else if (b.select === 'Violet' && lastResult.color === 'violet') win = true;
                else if (b.select === 'Big' && lastResult.bigSmall === 'Big') win = true;
                else if (b.select === 'Small' && lastResult.bigSmall === 'Small') win = true;

                if (win) {
                    b.status = 'Win';
                    let multiplier = (typeof b.select === 'number') ? 9 : 2;
                    if (users[b.phone]) users[b.phone].balance += (b.amount * multiplier);
                } else {
                    b.status = 'Loss';
                }
            }
        });
        io.emit('game-result', { lastResult, gameHistory });
    }
    io.emit('timer-update', { timer, period: currentPeriod });
}, 1000);

app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Phone and Password required' });
    if (users[phone]) return res.json({ success: false, message: 'Phone number already registered!' });
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

app.post('/api/forgot-password', (req, res) => {
    const { phone, newPassword } = req.body;
    if (!users[phone]) return res.json({ success: false, message: 'Phone not found' });
    users[phone].password = newPassword;
    res.json({ success: true, message: 'Password updated successfully!' });
});

app.post('/api/bet', (req, res) => {
    const { phone, select, amount } = req.body;
    const user = users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    user.balance -= Number(amount);
    const betObj = { id: Date.now(), phone, select, amount: Number(amount), period: currentPeriod, status: 'Pending' };
    bets.unshift(betObj);
    res.json({ success: true, message: 'Bet placed successfully!', newBalance: user.balance });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (amount < 100 || !utr) return res.json({ success: false, message: 'Min deposit ₹100 & valid UTR required' });
    const deposit = { id: Date.now(), phone, amount: Number(amount), utr, status: 'Pending', date: new Date().toLocaleString() };
    deposits.unshift(deposit);
    res.json({ success: true, message: 'Deposit request submitted!', deposit });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amount, bankName, holderName, accountNumber, ifscCode } = req.body;
    const user = users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    if (!bankName || !holderName || !accountNumber || !ifscCode) return res.json({ success: false, message: 'Enter full bank details' });
    user.balance -= Number(amount);
    const withdrawal = { id: Date.now(), phone, amount: Number(amount), bankDetails: { bankName, holderName, accountNumber, ifscCode }, status: 'Pending', date: new Date().toLocaleString() };
    withdrawals.unshift(withdrawal);
    res.json({ success: true, message: 'Withdrawal request submitted!', withdrawal });
});

app.get('/api/user-data', (req, res) => {
    const { phone } = req.query;
    res.json({ user: users[phone], deposits: deposits.filter(d => d.phone === phone), withdrawals: withdrawals.filter(w => w.phone === phone), bets: bets.filter(b => b.phone === phone), gameHistory });
});

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

app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>maan.win</title><script src="/socket.io/socket.io.js"></script><style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif;}body{background:#0b121e;color:#fff;display:flex;justify-content:center;}.app{width:100%;max-width:420px;background:#0f192c;padding:14px;min-height:100vh;position:relative;}.hdr{display:flex;justify-content:space-between;align-items:center;}.logo{font-size:22px;font-weight:bold;color:#ff9800;}.card{background:#16243d;border-radius:12px;padding:14px;margin-top:12px;}.btn-group{display:flex;gap:10px;margin-top:10px;}.btn{flex:1;padding:10px;border:none;border-radius:8px;font-weight:bold;color:#fff;cursor:pointer;}.btn-dep{background:#4caf50;}.btn-wd{background:#f44336;}.tmr{background:#1a2a47;border-radius:12px;padding:12px;margin-top:12px;text-align:center;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px;}.num{padding:10px;text-align:center;border-radius:50%;font-weight:bold;cursor:pointer;color:#fff;}.colors{display:flex;gap:8px;margin-top:12px;}.btn-c{flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.bs{display:flex;gap:10px;margin-top:12px;}.btn-b{background:#ff9800;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.btn-s{background:#2196f3;flex:1;padding:10px;border-radius:8px;border:none;color:#fff;font-weight:bold;cursor:pointer;}.tab-bar{display:flex;margin-top:15px;border-bottom:2px solid #1a2a47;}.tab{flex:1;text-align:center;padding:8px;color:#8a9bbd;cursor:pointer;font-size:12px;font-weight:bold;}.tab.active{color:#ff9800;border-bottom:2px solid #ff9800;}table{width:100%;margin-top:10px;font-size:12px;border-collapse:collapse;}th,td{padding:6px;text-align:center;border-bottom:1px solid #1a2a47;}.dot{height:10px;width:10px;border-radius:50%;display:inline-block;}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:100;}.box{width:90%;max-width:340px;background:#16243d;padding:20px;border-radius:12px;}.inp{width:100%;padding:10px;margin:6px 0;background:#0f192c;border:1px solid #2a3c5e;border-radius:8px;color:#fff;}.btn-o{width:100%;padding:10px;background:#ff9800;border:none;border-radius:8px;color:#fff;font-weight:bold;margin-top:8px;cursor:pointer;}.bet-popup{position:fixed;bottom:0;left:0;width:100%;background:#16243d;border-top-left-radius:16px;border-top-right-radius:16px;padding:16px;display:none;z-index:99;border-top:2px solid #ff9800;}.chip{padding:6px 12px;background:#0f192c;border-radius:6px;border:1px solid #2a3c5e;font-size:12px;cursor:pointer;}.chip.active{background:#ff9800;color:#fff;}</style></head><body><div id="auth" class="modal"><div class="box" id="lBox"><h2 style="color:#ff9800;text-align:center">maan.win Login</h2><input type="text" id="lPh" class="inp" placeholder="Phone Number"><input type="password" id="lPw" class="inp" placeholder="Password"><button class="btn-o" onclick="login()">Login</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('r')">Register Now</p><p style="color:#8a9bbd;text-align:center;margin-top:8px;font-size:12px;cursor:pointer" onclick="toggleAuth('f')">Forgot Password?</p></div><div class="box" id="rBox" style="display:none"><h2 style="color:#ff9800;text-align:center">Register Account</h2><input type="text" id="rPh" class="inp" placeholder="Phone Number"><input type="password" id="rPw" class="inp" placeholder="Password"><button class="btn-o" onclick="reg()">Register</button><p style="color:#ffb74d;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('l')">Login Now</p></div><div class="box" id="fBox" style="display:none"><h2 style="color:#ff9800;text-align:center">Reset Password</h2><input type="text" id="fPh" class="inp" placeholder="Phone Number"><div style="display:flex;gap:6px;"><input type="text" class="inp" placeholder="OTP" style="flex:2;"><button class="btn-o" style="flex:1;font-size:11px;" onclick="alert('OTP Sent!')">Send</button></div><input type="password" id="fPw" class="inp" placeholder="New Password"><button class="btn-o" onclick="forgot()">Reset</button><p style="color:#8a9bbd;text-align:center;margin-top:10px;cursor:pointer" onclick="toggleAuth('l')">Back</p></div></div><div id="depM" class="modal" style="display:none"><div class="box"><h3 style="color:#4caf50;">Deposit via QR</h3><div style="text-align:center;background:#fff;padding:8px;border-radius:6px;margin:6px 0;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=maan.win.payment" alt="QR" style="width:110px;height:110px;"></div><input type="number" id="dA" class="inp" placeholder="Amount (Min ₹100)"><input type="text" id="dU" class="inp" placeholder="12-digit UTR"><button class="btn-o" onclick="subD()">Submit</button><p style="color:#aaa;text-align:center;margin-top:8px;cursor:pointer" onclick="document.getElementById('depM').style.display='none'">Cancel</p></div></div><div id="wdM" class="modal" style="display:none"><div class="box"><h3 style="color:#f44336;">Withdrawal</h3><input type="number" id="wA" class="inp" placeholder="Amount"><input type="text" id="wB" class="inp" placeholder="Bank Name"><input type="text" id="wH" class="inp" placeholder="Holder Name"><input type="text" id="wAc" class="inp" placeholder="Account Number"><input type="text" id="wI" class="inp" placeholder="IFSC"><button class="btn-o" onclick="subW()">Submit</button><p style="color:#aaa;text-align:center;margin-top:8px;cursor:pointer" onclick="document.getElementById('wdM').style.display='none'">Cancel</p></div></div><div id="betPopup" class="bet-popup"><h3 id="betTitle" style="color:#ff9800;margin-bottom:8px;">Select</h3><div style="display:flex;gap:6px;margin:8px 0;"><span class="chip active" onclick="setBase(1,this)">₹1</span><span class="chip" onclick="setBase(10,this)">₹10</span><span class="chip" onclick="setBase(100,this)">₹100</span><span class="chip" onclick="setBase(1000,this)">₹1000</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;"><span style="font-size:13px;">Qty:</span><div><button style="padding:2px 8px;background:#0f192c;color:#fff;" onclick="chgQty(-1)">-</button><span id="qtyVal" style="margin:0 8px;">1</span><button style="padding:2px 8px;background:#0f192c;color:#fff;" onclick="chgQty(1)">+</button></div></div><div style="display:flex;justify-content:space-between;margin-top:12px;"><button style="padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;" onclick="document.getElementById('betPopup').style.display='none'">Cancel</button><button style="padding:8px 16px;background:#ff9800;color:#fff;border:none;border-radius:6px;font-weight:bold;" onclick="confirmBet()">Confirm ₹<span id="totBet">1</span></button></div></div><div class="app"><div class="hdr"><div class="logo">maan.win</div><div><a href="https://t.me/your_support" target="_blank" style="color:#ff9800;text-decoration:none;font-size:12px;">Support</a> <button onclick="logout()" style="background:#f44336;color:#fff;border:none;padding:4px 8px;border-radius:4px;margin-left:6px;cursor:pointer;">Logout</button></div></div><div class="card"><div style="font-size:12px;color:#8a9bbd">Wallet Balance (<span id="gId">ID: --</span>)</div><div style="font-size:24px;font-weight:bold">₹<span id="bal">0.00</span></div><div class="btn-group"><button class="btn btn-dep" onclick="document.getElementById('depM').style.display='flex'">Deposit</button><button class="btn btn-wd" onclick="document.getElementById('wdM').style.display='flex'">Withdraw</button></div></div><div class="tmr"><div style="font-size:12px;color:#ffb74d">WinGo 30sec Period: <span id="prd">--</span></div><div style="font-size:32px;font-weight:bold;color:#00e676" id="tmr">00:30</div></div><div class="colors"><button class="btn-c" style="background:#4caf50;" onclick="openBet('Green')">Green</button><button class="btn-c" style="background:#9c27b0;" onclick="openBet('Violet')">Violet</button><button class="btn-c" style="background:#f44336;" onclick="openBet('Red')">Red</button></div><div class="grid"><div class="num" style="background:#9c27b0" onclick="openBet(0)">0</div><div class="num" style="background:#4caf50" onclick="openBet(1)">1</div><div class="num" style="background:#f44336" onclick="openBet(2)">2</div><div class="num" style="background:#4caf50" onclick="openBet(3)">3</div><div class="num" style="background:#f44336" onclick="openBet(4)">4</div><div class="num" style="background:#9c27b0" onclick="openBet(5)">5</div><div class="num" style="background:#f44336" onclick="openBet(6)">6</div><div class="num" style="background:#4caf50" onclick="openBet(7)">7</div><div class="num" style="background:#f44336" onclick="openBet(8)">8</div><div class="num" style="background:#4caf50" onclick="openBet(9)">9</div></div><div class="bs"><button class="btn-b" onclick="openBet('Big')">Big</button><button class="btn-s" onclick="openBet('Small')">Small</button></div><div class="tab-bar"><div class="tab active" onclick="swTab(1,this)">Game</div><div class="tab" onclick="swTab(2,this)">My Bets</div><div class="tab" onclick="swTab(3,this)">Deposit</div><div class="tab" onclick="swTab(4,this)">Withdraw</div></div><div id="tabContent"></div></div><script>const socket=io();let u=JSON.parse(localStorage.getItem('user'));let sel=null,bAmt=1,qty=1,curTab=1;if(u){document.getElementById('auth').style.display='none';upd();}function toggleAuth(t){document.getElementById('lBox').style.display=t==='l'?'block':'none';document.getElementById('rBox').style.display=t==='r'?'block':'none';document.getElementById('fBox').style.display=t==='f'?'block':'none';}function reg(){fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('rPh').value,password:document.getElementById('rPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function login(){fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('lPh').value,password:document.getElementById('lPw').value})}).then(r=>r.json()).then(d=>{if(d.success){u=d.user;localStorage.setItem('user',JSON.stringify(d.user));document.getElementById('auth').style.display='none';upd();}else alert(d.message);});}function forgot(){fetch('/api/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('fPh').value,newPassword:document.getElementById('fPw').value})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success)toggleAuth('l');});}function logout(){localStorage.removeItem('user');location.reload();}function upd(){if(!u)return;document.getElementById('gId').innerText='ID: '+u.gameId;document.getElementById('bal').innerText=u.balance.toFixed(2);loadDat();}socket.on('timer-update',d=>{document.getElementById('tmr').innerText='00:'+(d.timer<10?'0':'')+d.timer;document.getElementById('prd').innerText=d.period;});socket.on('game-result',()=>loadDat());function openBet(s){sel=s;document.getElementById('betTitle').innerText='Select '+s;document.getElementById('betPopup').style.display='block';calcT();}function setBase(a,e){bAmt=a;document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));e.classList.add('active');calcT();}function chgQty(v){if(qty+v>=1){qty+=v;document.getElementById('qtyVal').innerText=qty;calcT();}}function calcT(){document.getElementById('totBet').innerText=(bAmt*qty).toFixed(2);}function confirmBet(){fetch('/api/bet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,select:sel,amount:bAmt*qty})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){u.balance=d.newBalance;document.getElementById('bal').innerText=u.balance.toFixed(2);document.getElementById('betPopup').style.display='none';loadDat();}});};function subD(){fetch('/api/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:document.getElementById('dA').value,utr:document.getElementById('dU').value})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){document.getElementById('depM').style.display='none';loadDat();}});};function subW(){fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:u.phone,amount:document.getElementById('wA').value,bankName:document.getElementById('wB').value,holderName:document.getElementById('wH').value,accountNumber:document.getElementById('wAc').value,ifscCode:document.getElementById('wI').value})}).then(r=>r.json()).then(d=>{alert(d.message);if(d.success){document.getElementById('wdM').style.display='none';loadDat();}});};function swTab(t,e){curTab=t;document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));e.classList.add('active');loadDat();};function loadDat(){if(!u)return;fetch('/api/user-data?phone='+u.phone).then(r=>r.json()).then(d=>{u.balance=d.user?d.user.balance:u.balance;document.getElementById('bal').innerText=u.balance.toFixed(2);let h='';if(curTab===1){h='<table><thead><tr><th>Period</th><th>Num</th><th>Big/Small</th><th>Color</th></tr></thead><tbody>';d.gameHistory.forEach(x=>{let c=x.color==='green'?'#4caf50':x.color==='red'?'#f44336':'#9c27b0';h+='<tr><td>'+x.period+'</td><td style="font-weight:bold;color:'+c+'">'+x.number+'</td><td>'+x.bigSmall+'</td><td><span class="dot" style="background:'+c+'"></span></td></tr>';});h+='</tbody></table>';}else if(curTab===2){h='<table><thead><tr><th>Period</th><th>Select</th><th>Amt</th><th>Status</th></tr></thead><tbody>';d.bets.forEach(b=>{let sc=b.status==='Win'?'#4caf50':b.status==='Loss'?'#f44336':'#ff9800';h+='<tr><td>'+b.period+'</td><td>'+b.select+'</td><td>₹'+b.amount+'</td><td style="color:'+sc+';font-weight:bold;">'+b.status+'</td></tr>';});h+='</tbody></table>';}else if(curTab===3){h='<table><thead><tr><th>Amount</th><th>UTR</th><th>Status</th></tr></thead><tbody>';d.deposits.forEach(dp=>{let dc=dp.status==='Approved'?'#4caf50':'#f44336';h+='<tr><td>₹'+dp.amount+'</td><td>'+dp.utr+'</td><td style="color:'+dc+';font-weight:bold;">'+dp.status+'</td></tr>';});h+='</tbody></table>';}else if(curTab===4){h='<table><thead><tr><th>Amount</th><th>Status</th></tr></thead><tbody>';d.withdrawals.forEach(w=>{let wc=w.status==='Approved'?'#4caf50':'#f44336';let wt=w.status==='Approved'?'Success':'Pending';h+='<tr><td>₹'+w.amount+'</td><td style="color:'+wc+';font-weight:bold;">'+wt+'</td></tr>';});h+='</tbody></table>';}document.getElementById('tabContent').innerHTML=h;});}</script></body></html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('Server live on port ' + PORT));
