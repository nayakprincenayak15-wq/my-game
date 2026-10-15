const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'db.json');

let db = {
    users: {}, deposits: [], withdrawals: [], bets: [], gameHistory: [],
    manualNextResult: null, manualBigSmall: null,
    settings: { telegram: 'https://t.me/support', announcement: 'Welcome to maan.win!', qrCode: 'https://via.placeholder.com/150' },
    currentPeriod: Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)),
    timer: 30
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        db.users = saved.users || {};
        db.deposits = saved.deposits || [];
        db.withdrawals = saved.withdrawals || [];
        db.bets = saved.bets || [];
        db.settings = saved.settings || db.settings;
    } catch(e){}
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({
            users: db.users, deposits: db.deposits, withdrawals: db.withdrawals,
            bets: db.bets, settings: db.settings
        }));
    } catch(e){}
}

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
                let sel = String(b.select).trim().toLowerCase();
                let numStr = String(num);

                if (sel === numStr) win = true;
                else if (sel === 'big' && bs === 'Big') win = true;
                else if (sel === 'small' && bs === 'Small') win = true;
                else if (sel === col) win = true;

                if (win) {
                    b.status = 'Win';
                    if (db.users[b.phone]) {
                        let mult = 2.0;
                        if (sel === '0' || sel === '9') mult = 10.0;
                        else if (sel >= '1' && sel <= '8') mult = Number(sel) + 1;
                        db.users[b.phone].balance += (b.totalAmount * mult);
                    }
                } else {
                    b.status = 'Loss';
                }
            }
        });
        saveData();
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
    saveData();
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
    saveData();
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
    saveData();
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
    saveData();
    res.json({ success: true, message: 'Bet placed successfully', newBalance: user.balance });
});

app.get('/api/admin/data', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ 
        onlineCount: Object.keys(db.users).length, 
        totalUsers: Object.keys(db.users).length,
        timer: db.timer,
        period: db.currentPeriod,
        deposits: db.deposits, 
        withdrawals: db.withdrawals, 
        bets: db.bets,
        usersList: Object.values(db.users),
        settings: db.settings
    });
});

app.post('/api/admin/approve', (req, res) => {
    const { type, id } = req.body;
    if (type === 'deposit') {
        let d = db.deposits.find(x => x.id == id);
        if (d && d.status === 'Pending') { 
            d.status = 'Approved'; 
            if (db.users[d.phone]) db.users[d.phone].balance += Number(d.amount); 
        }
    } else if (type === 'withdraw') {
        let w = db.withdrawals.find(x => x.id == id);
        if (w && w.status === 'Pending') w.status = 'Approved';
    }
    saveData();
    res.json({ success: true });
});

app.post('/api/admin/control', (req, res) => {
    const { nextNum, nextBs } = req.body;
    if(nextNum !== undefined && nextNum !== '') db.manualNextResult = Number(nextNum);
    if(nextBs !== undefined && nextBs !== '') db.manualBigSmall = nextBs;
    res.json({ success: true, message: 'Result controlled successfully' });
});

app.post('/api/admin/notice', (req, res) => {
    const { notice } = req.body;
    if(notice !== undefined) db.settings.announcement = notice;
    saveData();
    res.json({ success: true });
});

app.post('/api/admin/settings', (req, res) => {
    const { telegram, qrCode } = req.body;
    if(telegram) db.settings.telegram = telegram;
    if(qrCode) db.settings.qrCode = qrCode;
    saveData();
    res.json({ success: true });
});

app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(`<!DOCTYPE html><html><head><title>maan.win Master Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:8px;margin:0;}.box{background:#161b22;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #30363d;}h3{color:#58a6ff;margin-top:0;font-size:14px;}table{width:100%;border-collapse:collapse;font-size:9px;margin-top:6px;}th,td{border:1px solid #30363d;padding:4px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:4px 8px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:10px;font-weight:bold;margin:2px;}.btn-c{background:#1f6feb;}.inp{width:100%;padding:8px;margin:4px 0;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#fff;font-size:11px;box-sizing:border-box;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:5px;}</style></head><body>
    <h3 style="color:#f0883e;text-align:center;">maan.win Master Admin Panel</h3>
    <div class="box" style="display:flex;justify-content:space-around;text-align:center;">
        <div><b>Online:</b> <br><span id="onUsers" style="color:#00e676;font-size:16px;">0</span></div>
        <div><b>Total Reg:</b> <br><span id="totUsers" style="color:#58a6ff;font-size:16px;">0</span></div>
        <div><b>Timer:</b> <br><span id="admTimer" style="color:#ffa000;font-size:16px;">--</span></div>
    </div>

    <div class="box">
        <h3>🎯 Result Control (Next Period)</h3>
        <div style="font-size:10px;margin-bottom:4px;color:#8b949e;">Numbers (0-9):</div>
        <div class="grid">
            <button class="btn btn-c" onclick="setNum(0)">0 (10x)</button>
            <button class="btn btn-c" onclick="setNum(1)">1 (2x)</button>
            <button class="btn btn-c" onclick="setNum(2)">2 (3x)</button>
            <button class="btn btn-c" onclick="setNum(3)">3 (4x)</button>
            <button class="btn btn-c" onclick="setNum(4)">4 (5x)</button>
            <button class="btn btn-c" onclick="setNum(5)">5 (6x)</button>
            <button class="btn btn-c" onclick="setNum(6)">6 (7x)</button>
            <button class="btn btn-c" onclick="setNum(7)">7 (8x)</button>
            <button class="btn btn-c" onclick="setNum(8)">8 (9x)</button>
            <button class="btn btn-c" onclick="setNum(9)">9 (10x)</button>
        </div>
        <div style="font-size:10px;margin:8px 0 4px 0;color:#8b949e;">Big / Small:</div>
        <div style="display:flex;gap:4px;">
            <button class="btn" style="background:#ff9800;flex:1;" onclick="setBs('Big')">Force Big</button>
            <button class="btn" style="background:#2196f3;flex:1;" onclick="setBs('Small')">Force Small</button>
        </div>
        <div style="font-size:10px;margin:8px 0 4px 0;color:#8b949e;">Colors (Red / Green / Violet):</div>
        <div style="display:flex;gap:4px;">
            <button class="btn" style="background:#4caf50;flex:1;" onclick="setNum(1)">Green</button>
            <button class="btn" style="background:#9c27b0;flex:1;" onclick="setNum(0)">Violet</button>
            <button class="btn" style="background:#f44336;flex:1;" onclick="setNum(2)">Red</button>
        </div>
    </div>

    <div class="box">
        <h3>📢 Notice Board Manager</h3>
        <input type="text" id="noticeInp" class="inp" placeholder="Enter game notice message...">
        <button class="btn" style="width:100%;background:#238636;" onclick="saveNotice()">Broadcast Notice</button>
    </div>

    <div class="box">
        <h3>⚙️ Settings & QR Code Manager</h3>
        <input type="text" id="tgInp" class="inp" placeholder="Telegram Support Link">
        <input type="text" id="qrInp" class="inp" placeholder="Deposit QR Code Image URL">
        <button class="btn" style="width:100%;background:#238636;" onclick="saveSettings()">Save Settings</button>
    </div>

    <div class="box">
        <h3>💰 Deposits Management</h3><table id="dt"></table>
    </div>

    <div class="box">
        <h3>💸 Withdrawals Management</h3><table id="wt"></table>
    </div>

    <div class="box">
        <h3>🎮 Live User Bets Monitoring</h3><table id="bt"></table>
    </div>

    <script>
    function load(){
        fetch('/api/admin/data?t=' + Date.now()).then(r=>r.json()).then(d=>{
            document.getElementById('onUsers').innerText=d.onlineCount||0;
            document.getElementById('totUsers').innerText=d.totalUsers||0;
            document.getElementById('admTimer').innerText='00:'+(d.timer<10?'0':'')+d.timer;
            if(d.settings){
                if(document.activeElement!==document.getElementById('tgInp')) document.getElementById('tgInp').value=d.settings.telegram||'';
                if(document.activeElement!==document.getElementById('qrInp')) document.getElementById('qrInp').value=d.settings.qrCode||'';
                if(document.activeElement!==document.getElementById('noticeInp')) document.getElementById('noticeInp').value=d.settings.announcement||'';
            }
            let dt='<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Status</th><th>Action</th></tr>';
            if(d.deposits && d.deposits.length > 0){
                d.deposits.forEach(x=>{dt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td style="color:'+(x.status==='Approved'?'#00e676':'#ffa000')+'">'+x.status+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\'deposit\','+x.id+')">Approve</button>':'Done')+'</td></tr>'});
            } else {
                dt+='<tr><td colspan="5">No deposit requests</td></tr>';
            }
            document.getElementById('dt').innerHTML=dt;

            let wt='<tr><th>Phone</th><th>Amt</th><th>Bank Details</th><th>Status</th><th>Action</th></tr>';
            if(d.withdrawals && d.withdrawals.length > 0){
                d.withdrawals.forEach(x=>{let b=x.bankDetails?x.bankDetails.accNo+' ('+x.bankDetails.bankName+')':'--';wt+='<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+b+'</td><td style="color:'+(x.status==='Approved'?'#00e676':'#f44336')+'">'+x.status+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\'withdraw\','+x.id+')">Approve</button>':'Done')+'</td></tr>'});
            } else {
                wt+='<tr><td colspan="5">No withdrawal requests</td></tr>';
            }
            document.getElementById('wt').innerHTML=wt;

            let bt='<tr><th>Phone</th><th>Period</th><th>Selection</th><th>Total</th><th>Status</th></tr>';
            if(d.bets && d.bets.length > 0){
                d.bets.forEach(x=>{let sc=x.status==='Win'?'#00e676':x.status==='Loss'?'#f44336':'#ffa000';bt+='<tr><td>'+x.phone+'</td><td>'+x.period+'</td><td>'+x.select+'</td><td>₹'+x.totalAmount+'</td><td style="color:'+sc+';font-weight:bold;">'+x.status+'</td></tr>'});
            } else {
                bt+='<tr><td colspan="5">No bets placed yet</td></tr>';
            }
            document.getElementById('bt').innerHTML=bt;
        }).catch(e=>console.log(e));
    }
    function ap(t,id){fetch('/api/admin/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t,id})}).then(()=>load());}
    function setNum(n){fetch('/api/admin/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nextNum:n})}).then(()=>alert('Next Number set to: '+n));}
    function setBs(bs){fetch('/api/admin/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nextBs:bs})}).then(()=>alert('Next Big/Small set to: '+bs));}
    function saveNotice(){let n=document.getElementById('noticeInp').value;fetch('/api/admin/notice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notice:n})}).then(()=>alert('Notice broadcasted!'));}
    function saveSettings(){let tg=document.getElementById('tgInp').value;let qr=document.getElementById('qrInp').value;fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telegram:tg,qrCode:qr})}).then(()=>alert('Settings updated!'));}
    setInterval(load,1000);load();
    </script></body></html>`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

process.on('uncaughtException', (err) => { console.log('Handled error:', err); });
process.on('unhandledRejection', (err) => { console.log('Handled rejection:', err); });

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('Server is running and listening on port ' + PORT);
});
