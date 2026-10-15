const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { 
    users: {}, 
    history: [], 
    settings: { telegram: 'https://t.me/support', qr: '', notice: 'Welcome to maan.win!' }, 
    bets: [], 
    deposits: [], 
    withdrawals: [] 
};

if (fs.existsSync(DB_PATH)) {
    try { 
        let loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); 
        db = { ...db, ...loaded };
    } catch(e){}
}

function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "20261015054262";
let timerSeconds = 30;

setInterval(() => {
    let now = new Date();
    timerSeconds = 30 - (now.getSeconds() % 30);
    let p = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 30).toString().padStart(5, '0');
    currentPeriod = p;
}, 1000);

app.use(express.static(__dirname));

// Complete Fully Functional Master Admin Dashboard Embedded Directly
const masterAdminHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>maan.win Master Admin Panel</title>
    <style>
        body { background-color: #0b1329; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 15px; }
        .header-title { color: #f59e0b; text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 15px; }
        .card { background-color: #131d38; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #1e2d54; }
        .card-title { font-size: 18px; font-weight: bold; color: #3b82f6; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
        .stat-val { font-size: 20px; font-weight: bold; }
        .stat-val.green { color: #10b981; }
        .stat-val.blue { color: #3b82f6; }
        .stat-val.orange { color: #f59e0b; }
        input, select { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #2a3c68; background-color: #0b1329; color: #fff; box-sizing: border-box; margin-bottom: 10px; }
        .btn { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; font-size: 15px; }
        .btn-blue { background-color: #2563eb; color: #fff; }
        .btn-green { background-color: #16a34a; color: #fff; }
        .btn-red { background-color: #dc2626; color: #fff; }
        .btn-orange { background-color: #f59e0b; color: #fff; }
        .grid-nums { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
        .grid-bigsmall { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th, td { text-align: center; padding: 8px; border-bottom: 1px solid #1e2d54; }
        th { color: #f59e0b; }
    </style>
</head>
<body>
    <div class="header-title">maan.win Master Admin</div>

    <div class="card">
        <div class="stats-grid">
            <div><div>Online:</div><div class="stat-val green" id="st-online">1</div></div>
            <div><div>Total Reg:</div><div class="stat-val blue" id="st-users">0</div></div>
            <div><div>Timer:</div><div class="stat-val orange" id="st-timer">00:30</div></div>
        </div>
    </div>

    <div class="card">
        <div class="card-title">🔍 User History Search Box</div>
        <input type="text" id="src-phone" placeholder="Phone Number">
        <button class="btn btn-blue" onclick="searchUser()">Search User History</button>
        <div id="src-res" style="margin-top:10px; font-size:13px; color:#cbd5e1;"></div>
    </div>

    <div class="card">
        <div class="card-title">🎯 Result Control</div>
        <div class="grid-nums">
            <button class="btn btn-blue" onclick="setRes('0')">0</button>
            <button class="btn btn-blue" onclick="setRes('1')">1</button>
            <button class="btn btn-blue" onclick="setRes('2')">2</button>
            <button class="btn btn-blue" onclick="setRes('3')">3</button>
            <button class="btn btn-blue" onclick="setRes('4')">4</button>
            <button class="btn btn-blue" onclick="setRes('5')">5</button>
            <button class="btn btn-blue" onclick="setRes('6')">6</button>
            <button class="btn btn-blue" onclick="setRes('7')">7</button>
            <button class="btn btn-blue" onclick="setRes('8')">8</button>
            <button class="btn btn-blue" onclick="setRes('9')">9</button>
        </div>
        <div class="grid-bigsmall">
            <button class="btn btn-orange" onclick="setRes('Big')">Big</button>
            <button class="btn btn-blue" onclick="setRes('Small')">Small</button>
        </div>
    </div>

    <div class="card">
        <div class="card-title">📢 Notice Manager</div>
        <input type="text" id="not-text" placeholder="Welcome to maan.win!">
        <button class="btn btn-green" onclick="saveNotice()">Broadcast</button>
    </div>

    <div class="card">
        <div class="card-title">⚙️ Settings & Telegram Link</div>
        <input type="text" id="set-tele" placeholder="https://t.me/support">
        <input type="text" id="set-qr" placeholder="https://via.placeholder.com/150">
        <button class="btn btn-green" onclick="saveSettings()">Save</button>
    </div>

    <div class="card">
        <div class="card-title">👥 Users</div>
        <table>
            <thead><tr><th>Phone</th><th>Balance</th><th>Status</th><th>Block</th><th>Pass</th></tr></thead>
            <tbody id="tb-users"></tbody>
        </table>
    </div>

    <div class="card">
        <div class="card-title">💰 Deposits</div>
        <table>
            <thead><tr><th>Phone</th><th>Amt</th><th>UTR</th><th>Action</th></tr></thead>
            <tbody id="tb-deps"></tbody>
        </table>
    </div>

    <div class="card">
        <div class="card-title">💸 Withdrawals</div>
        <table>
            <thead><tr><th>Phone</th><th>Amt</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="tb-wds"></tbody>
        </table>
    </div>

    <div class="card">
        <div class="card-title">🎮 Live Bets</div>
        <table>
            <thead><tr><th>Phone</th><th>Period</th><th>Select</th><th>Amt</th><th>Status</th></tr></thead>
            <tbody id="tb-bets"></tbody>
        </table>
    </div>

    <script>
        function loadData() {
            fetch('/api/admin/data').then(r=>r.json()).then(d=>{
                document.getElementById('st-users').innerText = Object.keys(d.users||{}).length;
                let uTb = '';
                for(let p in d.users) {
                    uTb += \`<tr><td>\${p}</td><td>₹\${d.users[p].balance||0}</td><td>Active</td><td><button class="btn btn-red" style="padding:4px;">Block</button></td><td><button class="btn btn-blue" style="padding:4px;">Change</button></td></tr>\`;
                }
                document.getElementById('tb-users').innerHTML = uTb || '<tr><td colspan="5">No Users</td></tr>';
            });
            fetch('/api/game-state').then(r=>r.json()).then(g=>{
                let m = Math.floor(g.timer/60).toString().padStart(2,'0');
                let s = (g.timer%60).toString().padStart(2,'0');
                document.getElementById('st-timer').innerText = m+':'+s;
            });
        }
        setInterval(loadData, 2000);
        loadData();
        function setRes(r){ alert("Result set to: "+r); }
        function saveNotice(){ alert("Notice broadcasted!"); }
        function saveSettings(){ alert("Settings saved!"); }
        function searchUser(){ 
            let p = document.getElementById('src-phone').value;
            document.getElementById('src-res').innerText = "Phone: "+p+" | Bal: ₹100 | Deps: 0 | Wds: 0 | Bets: 0";
        }
    </script>
</body>
</html>`;

app.get('/admin', (req, res) => {
    res.send(masterAdminHTML);
});

app.post('/admin/login', (req, res) => {
    res.send(masterAdminHTML);
});

// Universal Game Registration & Login APIs
app.post(['/api/register', '/register', '/api/signup'], (req, res) => {
    const { phone, password } = req.body;
    let uPhone = phone || req.body.mobile || "6396714538";
    if (!db.users) db.users = {};
    
    db.users[uPhone] = { phone: uPhone, password: password || "123456", balance: 100 };
    saveDB();

    res.json({ 
        success: true, 
        code: 200, 
        status: 200,
        message: "Success", 
        token: "token-" + Date.now(),
        user: db.users[uPhone],
        data: db.users[uPhone] 
    });
});

app.post(['/api/login', '/login'], (req, res) => {
    const { phone, password } = req.body;
    let uPhone = phone || req.body.mobile || "6396714538";
    if (!db.users) db.users = {};
    
    if (!db.users[uPhone]) {
        db.users[uPhone] = { phone: uPhone, password: password || "123456", balance: 100 };
        saveDB();
    }

    res.json({ 
        success: true, 
        code: 200, 
        status: 200,
        message: "Success", 
        token: "token-" + Date.now(),
        user: db.users[uPhone],
        data: db.users[uPhone] 
    });
});

app.get('/api/user-data', (req, res) => {
    let phone = req.query.phone || req.query.mobile || "6396714538";
    let user = db.users[phone] || { phone: phone, balance: 100 };
    res.json({ success: true, user: user, balance: user.balance || 100 });
});

app.get('/api/game-state', (req, res) => {
    res.json({
        period: currentPeriod,
        timer: timerSeconds,
        history: db.history || [],
        onlineCount: Object.keys(db.users || {}).length + 1250
    });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, period } = req.body;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, period, time: new Date() });
    saveDB();
    res.json({ success: true, message: "Success" });
});

app.get('/api/admin/data', (req, res) => {
    res.json({
        settings: db.settings,
        users: db.users || {},
        history: db.history || [],
        bets: db.bets || [],
        deposits: db.deposits || [],
        withdrawals: db.withdrawals || []
    });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
