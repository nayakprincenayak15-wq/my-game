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
    settings: { telegram: 'https://t.me/support', qr: 'https://via.placeholder.com/150', notice: 'Welcome to maan.win!' }, 
    bets: [], 
    deposits: [], 
    withdrawals: [] 
};

if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e){}
}

function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let currentPeriod = "20261015033733";
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

const gameHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>maan.win</title>
    <style>
        body { background-color: #0b1329; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 15px; }
        .container { max-width: 420px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .logo { font-size: 24px; font-weight: bold; color: #f59e0b; }
        .btn-top { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: bold; }
        .btn-logout { background: #dc2626; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: bold; }
        .card { background-color: #131d38; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #1e2d54; }
        input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #2a3c68; background-color: #0b1329; color: #fff; box-sizing: border-box; margin-bottom: 12px; }
        .btn { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; font-size: 15px; }
        .btn-orange { background-color: #f59e0b; color: #000; }
        .btn-green { background-color: #16a34a; color: #fff; }
        .btn-red { background-color: #dc2626; color: #fff; }
        .btn-blue { background-color: #2563eb; color: #fff; }
        .btn-violet { background-color: #9333ea; color: #fff; }
        .timer-box { font-size: 34px; font-weight: bold; color: #10b981; text-align: center; margin: 10px 0; }
        .grid-num { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 10px 0; }
        .num-btn { padding: 12px 0; border-radius: 50%; border: none; font-weight: bold; color: #fff; cursor: pointer; font-size: 15px; }
        .hidden { display: none; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #131d38; padding: 20px; border-radius: 12px; width: 90%; max-width: 350px; border: 1px solid #1e2d54; }
    </style>
</head>
<body>
    <div class="container">
        <!-- AUTH SECTION -->
        <div id="auth-section">
            <div style="text-align:center; font-size:32px; font-weight:bold; color:#f59e0b; margin: 40px 0 20px 0;">maan.win</div>
            
            <div id="login-form" class="card">
                <h3 id="auth-title" style="color:#f59e0b; margin-top:0;">Login</h3>
                <input type="text" id="phone" placeholder="Enter your phone number">
                <input type="password" id="password" placeholder="Password: 8-15 chars & numbers">
                <input type="password" id="cpassword" placeholder="Confirm password" class="hidden">
                <button class="btn btn-orange" id="auth-btn" onclick="submitAuth()">Login</button>
                <button class="btn" style="background:transparent; color:#3b82f6; margin-top:10px;" onclick="toggleMode()">Register Now</button>
            </div>
        </div>

        <!-- GAME DASHBOARD -->
        <div id="game-section" class="hidden">
            <div class="header">
                <div class="logo">maan.win</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-top" onclick="window.open('https://t.me/support', '_blank')">Telegram</button>
                    <button class="btn-logout" onclick="logout()">Logout</button>
                </div>
            </div>

            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:12px; color:#94a3b8;" id="user-id-display">Balance (ID: MW984389)</div>
                    <div style="font-size:22px; font-weight:bold; color:#10b981;" id="user-bal">₹0.00</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-top" onclick="openModal('refer-modal')" style="background:#1e293b; border:1px solid #3b82f6;">Refer</button>
                    <button class="btn-top" onclick="openModal('notice-modal')" style="background:#f59e0b; color:#000;">NOTICE</button>
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <button class="btn btn-green" onclick="openModal('deposit-modal')">Deposit</button>
                <button class="btn btn-red" onclick="openModal('withdraw-modal')">Withdraw</button>
            </div>

            <div class="card">
                <div style="font-size:13px; color:#94a3b8;">Period: <span id="period-val" style="color:#f59e0b; font-weight:bold;"></span></div>
                <div class="timer-box" id="timer-val">00:30</div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:10px;">
                    <button class="btn btn-green" onclick="openBet('Green', 1)">Green</button>
                    <button class="btn btn-violet" onclick="openModal('bet-modal');">Violet</button>
                    <button class="btn btn-red" onclick="openBet('Red', 1)">Red</button>
                </div>

                <div class="grid-num">
                    <button class="num-btn btn-green" onclick="openBet('0', 9)">0</button>
                    <button class="num-btn btn-green" onclick="openBet('1', 2)">1</button>
                    <button class="num-btn btn-red" onclick="openBet('2', 3)">2</button>
                    <button class="num-btn btn-green" onclick="openBet('3', 4)">3</button>
                    <button class="num-btn btn-red" onclick="openBet('4', 5)">4</button>
                    <button class="num-btn btn-violet" onclick="openBet('5', 6)">5</button>
                    <button class="num-btn btn-red" onclick="openBet('6', 7)">6</button>
                    <button class="num-btn btn-green" onclick="openBet('7', 8)">8</button>
                    <button class="num-btn btn-red" onclick="openBet('8', 9)">9</button>
                    <button class="num-btn btn-green" onclick="openBet('9', 10)">10</button>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                    <button class="btn btn-orange" onclick="openBet('Big', 1)">Big</button>
                    <button class="btn btn-blue" onclick="openBet('Small', 1)">Small</button>
                </div>
            </div>

            <div class="card">
                <h3 style="color:#f59e0b; margin-top:0;">Game History</h3>
                <div id="history-list"></div>
            </div>
        </div>
    </div>

    <!-- MODALS -->
    <div id="notice-modal" class="modal hidden">
        <div class="modal-content">
            <h3 style="color:#f59e0b; margin-top:0;">Notice</h3>
            <p id="notice-text">Welcome to maan.win!</p>
            <button class="btn btn-orange" onclick="closeModal('notice-modal')">Close</button>
        </div>
    </div>

    <div id="refer-modal" class="modal hidden">
        <div class="modal-content">
            <h3 style="color:#3b82f6; margin-top:0;">Refer & Earn (10% Bonus)</h3>
            <p style="font-size:13px; color:#cbd5e1;">Share your link and get 10% bonus on first deposit!</p>
            <input type="text" id="refer-link" readonly>
            <button class="btn btn-green" onclick="copyRefer()">Copy Link</button>
            <button class="btn btn-red" onclick="closeModal('refer-modal')" style="margin-top:8px;">Close</button>
        </div>
    </div>

    <div id="deposit-modal" class="modal hidden">
        <div class="modal-content">
            <h3 style="color:#f59e0b; margin-top:0;">Deposit Funds</h3>
            <div style="text-align:center; margin-bottom:10px;"><img src="https://via.placeholder.com/130" style="border-radius:8px;"></div>
            <input type="number" id="dep-amt" placeholder="Amount (e.g. 100)">
            <input type="text" id="dep-utr" placeholder="Enter 12-digit UTR">
            <button class="btn btn-orange" onclick="submitDeposit()">Submit Deposit</button>
            <button class="btn btn-red" onclick="closeModal('deposit-modal')" style="margin-top:8px;">Cancel</button>
        </div>
    </div>

    <div id="withdraw-modal" class="modal hidden">
        <div class="modal-content">
            <h3 style="color:#f59e0b; margin-top:0;">Withdrawal Request</h3>
            <input type="number" id="wd-amt" placeholder="Amount">
            <input type="text" id="wd-bank" placeholder="Bank Name">
            <input type="text" id="wd-holder" placeholder="Bank Holder Name">
            <input type="text" id="wd-acc" placeholder="Account Number">
            <input type="text" id="wd-ifsc" placeholder="IFSC Code">
            <button class="btn btn-orange" onclick="submitWithdraw()">Submit Request</button>
            <button class="btn btn-red" onclick="closeModal('withdraw-modal')" style="margin-top:8px;">Cancel</button>
        </div>
    </div>

    <script>
        let isReg = false;
        let currentUser = null;

        function toggleMode() {
            isReg = !isReg;
            document.getElementById('auth-title').innerText = isReg ? "Register" : "Login";
            document.getElementById('auth-btn').innerText = isReg ? "Register" : "Login";
            document.getElementById('cpassword').classList.toggle('hidden', !isReg);
        }

        function submitAuth() {
            let phone = document.getElementById('phone').value;
            let password = document.getElementById('password').value;
            let cpassword = document.getElementById('cpassword').value;

            if(!phone || phone.length < 10) { alert("Enter valid phone number!"); return; }
            if(password.length < 8) { alert("Password must be at least 8 characters!"); return; }
            if(isReg && password !== cpassword) { alert("Passwords do not match!"); return; }

            fetch(isReg ? '/api/register' : '/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            }).then(r => r.json()).then(data => {
                if(data.success) {
                    localStorage.setItem('mw_user', JSON.stringify(data.user));
                    initGame(data.user);
                } else {
                    alert(data.message);
                }
            });
        }

        let saved = localStorage.getItem('mw_user');
        if(saved) { initGame(JSON.parse(saved)); }

        function initGame(user) {
            currentUser = user;
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('game-section').classList.remove('hidden');
            document.getElementById('user-id-display').innerText = \`Balance (ID: \${user.customId})\`;
            document.getElementById('user-bal').innerText = \`₹\${user.balance.toFixed(2)}\`;
            document.getElementById('refer-link').value = window.location.origin + "/?ref=" + user.customId;
            setInterval(updateState, 1000);
        }

        function logout() {
            localStorage.removeItem('mw_user');
            location.reload();
        }

        function updateState() {
            fetch('/api/game-state').then(r => r.json()).then(g => {
                document.getElementById('period-val').innerText = g.period;
                let m = Math.floor(g.timer/60).toString().padStart(2,'0');
                let s = (g.timer%60).toString().padStart(2,'0');
                document.getElementById('timer-val').innerText = m + ':' + s;
                
                let hHtml = \`<table style="width:100%; text-align:center; font-size:13px;">\`;
                hHtml += \`<tr style="color:#f59e0b;"><th>Period</th><th>Num</th><th>Result</th></tr>\`;
                g.history.slice(0, 10).forEach(h => {
                    hHtml += \`<tr><td>\${h.period}</td><td>\${h.num}</td><td>\${h.result}</td></tr>\`;
                });
                hHtml += '</table>';
                document.getElementById('history-list').innerHTML = hHtml;
            });
        }

        function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
        function copyRefer() {
            let copyText = document.getElementById('refer-link');
            copyText.select();
            navigator.clipboard.writeText(copyText.value);
            alert("Referral link copied!");
        }

        function openBet(choice, multiplier) {
            let amt = prompt("Enter bet amount:", "100");
            if(!amt || isNaN(amt)) return;
            fetch('/api/bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: currentUser.phone, amount: Number(amt), choice, multiplier })
            }).then(r => r.json()).then(d => {
                alert(d.message);
                if(d.success) {
                    currentUser.balance -= Number(amt);
                    document.getElementById('user-bal').innerText = \`₹\${currentUser.balance.toFixed(2)}\`;
                }
            });
        }

        function submitDeposit() {
            let amt = document.getElementById('dep-amt').value;
            let utr = document.getElementById('dep-utr').value;
            if(!amt || !utr) { alert("Fill all fields!"); return; }
            fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: currentUser.phone, amount: amt, utr })
            }).then(r => r.json()).then(d => {
                alert(d.message);
                closeModal('deposit-modal');
            });
        }

        function submitWithdraw() {
            let amt = document.getElementById('wd-amt').value;
            let bank = document.getElementById('wd-bank').value;
            let holder = document.getElementById('wd-holder').value;
            let acc = document.getElementById('wd-acc').value;
            let ifsc = document.getElementById('wd-ifsc').value;
            if(!amt || !bank || !acc) { alert("Fill all required fields!"); return; }
            fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: currentUser.phone, amt, bank, holder, acc, ifsc })
            }).then(r => r.json()).then(d => {
                alert(d.message);
                closeModal('withdraw-modal');
            });
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(gameHTML);
});

// APIs
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users) db.users = {};
    if (db.users[phone]) {
        return res.json({ success: false, message: "Phone number already registered!" });
    }
    let customId = "MW" + Math.floor(100000 + Math.random() * 900000);
    db.users[phone] = { phone, password, balance: 100, customId };
    saveDB();
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users || !db.users[phone] || db.users[phone].password !== password) {
        return res.json({ success: false, message: "Invalid phone number or password!" });
    }
    res.json({ success: true, user: db.users[phone] });
});

app.get('/api/game-state', (req, res) => {
    if (!db.history) db.history = [];
    res.json({
        period: currentPeriod,
        timer: timerSeconds,
        history: db.history
    });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, multiplier } = req.body;
    if (!db.users[phone] || db.users[phone].balance < amount) {
        return res.json({ success: false, message: "Insufficient balance!" });
    }
    db.users[phone].balance -= amount;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, multiplier, period: currentPeriod, time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed successfully!" });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (!db.deposits) db.deposits = [];
    db.deposits.push({ phone, amount, utr, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Deposit request submitted successfully!" });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amt, bank, holder, acc, ifsc } = req.body;
    if (!db.withdrawals) db.withdrawals = [];
    db.withdrawals.push({ phone, amt, bank, holder, acc, ifsc, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Withdrawal request submitted successfully!" });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
