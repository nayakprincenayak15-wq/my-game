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

// Complete Embedded Game & Login UI
const gameHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>maan.win</title>
    <style>
        body { background-color: #0b1329; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 15px; }
        .container { max-width: 400px; margin: auto; padding-top: 30px; }
        .logo { text-align: center; font-size: 28px; font-weight: bold; color: #f59e0b; margin-bottom: 20px; }
        .card { background-color: #131d38; border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 1px solid #1e2d54; }
        input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #2a3c68; background-color: #0b1329; color: #fff; box-sizing: border-box; margin-bottom: 15px; }
        .btn { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; font-size: 16px; margin-bottom: 10px; }
        .btn-orange { background-color: #f59e0b; color: #000; }
        .btn-blue { background-color: #2563eb; color: #fff; }
        .timer-box { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 15px 0; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">maan.win</div>
        
        <!-- Login / Register Section -->
        <div id="auth-card" class="card">
            <h3>Login / Register</h3>
            <input type="text" id="phone" placeholder="Enter Phone Number">
            <input type="password" id="password" placeholder="Enter Password">
            <button class="btn btn-orange" onclick="handleAuth('/api/login')">Login</button>
            <button class="btn btn-blue" onclick="handleAuth('/api/register')">Register Now</button>
        </div>

        <!-- Game Dashboard Section -->
        <div id="game-card" class="card hidden">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>Balance: <span id="user-bal" style="color:#10b981; font-weight:bold;">₹100</span></div>
                <button onclick="logout()" style="background:#dc2626; color:#fff; border:none; padding:5px 10px; border-radius:5px;">Logout</button>
            </div>
            <div style="margin-top:15px; font-size:14px; color:#94a3b8;">Period: <span id="period-val"></span></div>
            <div class="timer-box" id="timer-val">00:30</div>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:15px;">
                <button class="btn" style="background:#16a34a; color:#fff;" onclick="placeBet('Green')">Green</button>
                <button class="btn" style="background:#9333ea; color:#fff;" onclick="placeBet('Violet')">Violet</button>
                <button class="btn" style="background:#dc2626; color:#fff;" onclick="placeBet('Red')">Red</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button class="btn btn-orange" onclick="placeBet('Big')">Big</button>
                <button class="btn btn-blue" onclick="placeBet('Small')">Small</button>
            </div>
        </div>
    </div>

    <script>
        let currentUser = localStorage.getItem('mw_phone');
        if(currentUser) { showGame(currentUser); }

        function handleAuth(endpoint) {
            let phone = document.getElementById('phone').value;
            let password = document.getElementById('password').value;
            if(!phone) { alert("Please enter phone number!"); return; }

            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    localStorage.setItem('mw_phone', phone);
                    showGame(phone);
                } else {
                    alert(data.message || "Action failed");
                }
            });
        }

        function showGame(phone) {
            document.getElementById('auth-card').classList.add('hidden');
            document.getElementById('game-card').classList.remove('hidden');
            setInterval(updateState, 1000);
        }

        function logout() {
            localStorage.removeItem('mw_phone');
            location.reload();
        }

        function updateState() {
            fetch('/api/game-state').then(r => r.json()).then(g => {
                document.getElementById('period-val').innerText = g.period;
                let m = Math.floor(g.timer/60).toString().padStart(2,'0');
                let s = (g.timer%60).toString().padStart(2,'0');
                document.getElementById('timer-val').innerText = m + ':' + s;
            });
        }

        function placeBet(choice) {
            let phone = localStorage.getItem('mw_phone');
            fetch('/api/bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, amount: 100, choice })
            }).then(r => r.json()).then(d => {
                alert("Bet placed successfully on " + choice + "!");
            });
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(gameHTML);
});

// Admin Panel Route
const masterAdminHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>maan.win Master Admin</title>
    <style>
        body { background: #0b1329; color: #fff; font-family: sans-serif; padding: 20px; }
        h1 { color: #f59e0b; text-align: center; }
        .card { background: #131d38; padding: 15px; border-radius: 10px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <h1>maan.win Master Admin Panel</h1>
    <div class="card">
        <h3>Total Registered Users: <span id="u-count">0</span></h3>
    </div>
    <script>
        fetch('/api/admin/data').then(r=>r.json()).then(d=>{
            document.getElementById('u-count').innerText = Object.keys(d.users||{}).length;
        });
    </script>
</body>
</html>`;

app.get('/admin', (req, res) => {
    res.send(masterAdminHTML);
});

app.post('/admin/login', (req, res) => {
    res.send(masterAdminHTML);
});

// APIs
app.post(['/api/register', '/register', '/api/login', '/login'], (req, res) => {
    const { phone, password } = req.body;
    if (!phone) return res.json({ success: false, message: "Phone required" });
    if (!db.users) db.users = {};
    if (!db.users[phone]) {
        db.users[phone] = { phone, password: password || "123456", balance: 100 };
        saveDB();
    }
    res.json({ success: true, message: "Success", user: db.users[phone] });
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
    const { phone, amount, choice } = req.body;
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed" });
});

app.get('/api/admin/data', (req, res) => {
    res.json({
        settings: db.settings,
        users: db.users || {},
        bets: db.bets || []
    });
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
