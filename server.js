const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// In-Memory Database
let users = {};
let deposits = [];
let withdrawals = [];
let gameHistory = [];
let currentPeriod = Number(new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14));
let timer = 30;

// Game Loop (Runs 24/7 on cloud)
setInterval(() => {
    timer--;
    if (timer <= 0) {
        timer = 30;
        currentPeriod++;
        const randomNum = Math.floor(Math.random() * 10);
        const bigSmall = randomNum >= 5 ? 'Big' : 'Small';
        let color = 'green';
        if (randomNum === 0 || randomNum === 5) color = 'violet';
        else if (randomNum % 2 === 0) color = 'red';

        const lastResult = { period: currentPeriod - 1, number: randomNum, bigSmall, color };
        gameHistory.unshift(lastResult);
        if (gameHistory.length > 50) gameHistory.pop();

        io.emit('game-result', lastResult);
    }
    io.emit('timer-update', { timer, period: currentPeriod });
}, 1000);

// API Endpoints
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.json({ success: false, message: 'Invalid data' });
    if (users[phone]) return res.json({ success: false, message: 'User already exists' });

    const gameId = 'MW' + Math.floor(100000 + Math.random() * 900000);
    users[phone] = { phone, password, gameId, balance: 0.00, totalRecharge: 0 };
    res.json({ success: true, user: users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    const user = users[phone];
    if (user && user.password === password) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    if (!amount || amount < 100) return res.json({ success: false, message: 'Minimum deposit is ₹100' });
    if (!utr || utr.length < 6) return res.json({ success: false, message: 'Please enter valid UTR Number' });
    
    const deposit = { id: Date.now(), phone, amount: Number(amount), utr, status: 'Pending', date: new Date().toLocaleString() };
    deposits.push(deposit);
    res.json({ success: true, message: 'Deposit request submitted successfully!', deposit });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amount, bankName, holderName, accountNumber, ifscCode } = req.body;
    const user = users[phone];
    if (!user || user.balance < amount) return res.json({ success: false, message: 'Insufficient balance' });
    if (!bankName || !holderName || !accountNumber || !ifscCode) {
        return res.json({ success: false, message: 'Please enter complete bank details' });
    }

    user.balance -= Number(amount);
    const withdrawal = { 
        id: Date.now(), 
        phone, 
        amount: Number(amount), 
        bankDetails: { bankName, holderName, accountNumber, ifscCode }, 
        status: 'Pending', 
        date: new Date().toLocaleString() 
    };
    withdrawals.push(withdrawal);
    res.json({ success: true, message: 'Withdrawal request submitted successfully!', withdrawal });
});

app.get('/api/history', (req, res) => {
    const { phone } = req.query;
    const userDeposits = deposits.filter(d => d.phone === phone);
    const userWithdrawals = withdrawals.filter(w => w.phone === phone);
    res.json({ deposits: userDeposits, withdrawals: userWithdrawals, gameHistory });
});

// Serve HTML directly
app.get('*', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>maan.win 24/7 Live Game</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #0b121e; color: #fff; display: flex; justify-content: center; min-height: 100vh; }
        .app-container { width: 100%; max-width: 420px; background: #0f192c; padding: 16px; min-height: 100vh; }
        
        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #1e2d4a; }
        .logo { font-size: 22px; font-weight: bold; color: #ff9800; }
        .support-icon { font-size: 14px; color: #ff9800; text-decoration: none; }

        .card { background: #16243d; border-radius: 12px; padding: 16px; margin-top: 14px; }
        .balance-title { font-size: 13px; color: #8a9bbd; }
        .balance-val { font-size: 24px; font-weight: bold; color: #fff; margin: 6px 0; }
        .btn-group { display: flex; gap: 10px; margin-top: 10px; }
        .btn { flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; color: #fff; }
        .btn-withdraw { background: #e53935; }
        .btn-deposit { background: #43a047; }

        .timer-card { background: #1a2a47; border-radius: 12px; padding: 14px; margin-top: 14px; text-align: center; }
        .period-no { font-size: 12px; color: #ffb74d; }
        .timer-val { font-size: 32px; font-weight: bold; color: #00e676; margin-top: 4px; }

        .bet-buttons { display: flex; gap: 10px; margin-top: 14px; }
        .btn-green { background: #2e7d32; flex: 1; padding: 12px; border-radius: 8px; border: none; color: #fff; font-weight: bold; }
        .btn-violet { background: #7b1fa2; flex: 1; padding: 12px; border-radius: 8px; border: none; color: #fff; font-weight: bold; }
        .btn-red { background: #c62828; flex: 1; padding: 12px; border-radius: 8px; border: none; color: #fff; font-weight: bold; }

        .numbers-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 14px; }
        .num-btn { background: #1e2f4d; padding: 12px; text-align: center; border-radius: 50%; font-weight: bold; border: 1px solid #2c436b; cursor: pointer; }

        .history-title { margin-top: 20px; font-size: 16px; border-bottom: 2px solid #ff9800; padding-bottom: 6px; }
        .history-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1a2a47; font-size: 13px; }
        .status-pending { color: #f44336; font-weight: bold; }
        .status-success { color: #4caf50; font-weight: bold; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 100; }
        .modal-box { width: 90%; max-width: 360px; background: #16243d; padding: 20px; border-radius: 12px; }
        .input-field { width: 100%; padding: 10px; margin: 6px 0; background: #0f192c; border: 1px solid #2a3c5e; border-radius: 8px; color: #fff; }
        .btn-orange { width: 100%; padding: 12px; background: #ff9800; border: none; border-radius: 8px; color: #fff; font-weight: bold; margin-top: 10px; cursor: pointer; }
        .link-txt { color: #ffb74d; text-align: center; margin-top: 12px; font-size: 13px; cursor: pointer; }
    </style>
</head>
<body>

<div id="authScreen" class="modal-overlay">
    <div class="modal-box" id="loginBox">
        <h2 style="color: #ff9800; text-align: center; margin-bottom: 16px;">maan.win Login</h2>
        <input type="text" id="loginPhone" class="input-field" placeholder="Enter Phone Number">
        <input type="password" id="loginPass" class="input-field" placeholder="Enter Password">
        <button class="btn-orange" onclick="login()">Login</button>
        <div class="link-txt" onclick="toggleAuth('register')">New User? Register Now</div>
        <div class="link-txt" onclick="toggleAuth('forgot')">Forgot Password?</div>
    </div>

    <div class="modal-box" id="registerBox" style="display: none;">
        <h2 style="color: #ff9800; text-align: center; margin-bottom: 16px;">Register Account</h2>
        <input type="text" id="regPhone" class="input-field" placeholder="Enter Phone Number">
        <input type="password" id="regPass" class="input-field" placeholder="Set Password (8-15 chars)">
        <button class="btn-orange" onclick="register()">Register</button>
        <div class="link-txt" onclick="toggleAuth('login')">Already have an account? Login</div>
    </div>

    <div class="modal-box" id="forgotBox" style="display: none;">
        <h2 style="color: #ff9800; text-align: center; margin-bottom: 16px;">Set Login Password</h2>
        <input type="text" class="input-field" placeholder="Enter Phone Number">
        <div style="display: flex; gap: 6px;">
            <input type="text" class="input-field" placeholder="OTP Code" style="flex: 2;">
            <button class="btn-orange" style="flex: 1; font-size: 11px; margin-top: 6px;">Send</button>
        </div>
        <input type="password" class="input-field" placeholder="New Password">
        <button class="btn-orange" onclick="alert('Password updated!'); toggleAuth('login');">Complete</button>
        <div class="link-txt" onclick="toggleAuth('login')">Back to Login</div>
    </div>
</div>

<!-- Deposit Modal -->
<div id="depositModal" class="modal-overlay" style="display: none;">
    <div class="modal-box">
        <h3 style="color: #4caf50; margin-bottom: 10px;">Deposit via QR Code</h3>
        <div style="text-align: center; padding: 10px; background: #fff; border-radius: 8px; margin-bottom: 10px;">
            <p style="color: #000; font-weight: bold; font-size: 12px;">Scan QR & Pay</p>
            <div style="width: 140px; height: 140px; background: #ccc; margin: 6px auto; display: flex; align-items: center; justify-content: center; color: #333; font-size: 11px;">[QR Code Area]</div>
        </div>
        <input type="number" id="depAmount" class="input-field" placeholder="Enter Amount (Min ₹100)">
        <input type="text" id="depUtr" class="input-field" placeholder="Enter 12-Digit UTR Number">
        <button class="btn-orange" onclick="submitDeposit()">Submit Deposit</button>
        <div class="link-txt" onclick="document.getElementById('depositModal').style.display='none'">Cancel</div>
    </div>
</div>

<!-- Withdrawal Modal -->
<div id="withdrawModal" class="modal-overlay" style="display: none;">
    <div class="modal-box">
        <h3 style="color: #e53935; margin-bottom: 10px;">Withdrawal Details</h3>
        <input type="number" id="wdAmount" class="input-field" placeholder="Enter Amount">
        <input type="text" id="wdBank" class="input-field" placeholder="Bank Name">
        <input type="text" id="wdHolder" class="input-field" placeholder="Account Holder Name">
        <input type="text" id="wdAccount" class="input-field" placeholder="Account Number">
        <input type="text" id="wdIfsc" class="input-field" placeholder="IFSC Code">
        <button class="btn-orange" onclick="submitWithdraw()">Submit Withdrawal</button>
        <div class="link-txt" onclick="document.getElementById('withdrawModal').style.display='none'">Cancel</div>
    </div>
</div>

<div class="app-container">
    <div class="header">
        <div class="logo">maan.win</div>
        <a href="https://t.me/your_support" target="_blank" class="support-icon">✈ Telegram Support</a>
    </div>

    <div class="card">
        <div class="balance-title">Wallet Balance (<span id="userGameId">ID: --</span>)</div>
        <div class="balance-val">₹<span id="userBalance">0.00</span></div>
        <div class="btn-group">
            <button class="btn btn-deposit" onclick="document.getElementById('depositModal').style.display='flex'">Deposit</button>
            <button class="btn btn-withdraw" onclick="document.getElementById('withdrawModal').style.display='flex'">Withdraw</button>
        </div>
    </div>

    <div class="timer-card">
        <div class="period-no">Period: <span id="periodNo">--</span></div>
        <div class="timer-val" id="timer">00:30</div>
    </div>

    <div class="bet-buttons">
        <button class="btn-green" onclick="alert('Bet placed Green')">Green</button>
        <button class="btn-violet" onclick="alert('Bet placed Violet')">Violet</button>
        <button class="btn-red" onclick="alert('Bet placed Red')">Red</button>
    </div>

    <div class="numbers-grid">
        <div class="num-btn" onclick="alert('Bet 0')">0</div>
        <div class="num-btn" onclick="alert('Bet 1')">1</div>
        <div class="num-btn" onclick="alert('Bet 2')">2</div>
        <div class="num-btn" onclick="alert('Bet 3')">3</div>
        <div class="num-btn" onclick="alert('Bet 4')">4</div>
        <div class="num-btn" onclick="alert('Bet 5')">5</div>
        <div class="num-btn" onclick="alert('Bet 6')">6</div>
        <div class="num-btn" onclick="alert('Bet 7')">7</div>
        <div class="num-btn" onclick="alert('Bet 8')">8</div>
        <div class="num-btn" onclick="alert('Bet 9')">9</div>
    </div>

    <div class="history-title">Transaction History</div>
    <div id="txHistory"></div>
</div>

<script>
    const socket = io();
    let currentUser = JSON.parse(localStorage.getItem('user'));

    if (currentUser) {
        document.getElementById('authScreen').style.display = 'none';
        updateUserData();
    }

    function toggleAuth(type) {
        document.getElementById('loginBox').style.display = type === 'login' ? 'block' : 'none';
        document.getElementById('registerBox').style.display = type === 'register' ? 'block' : 'none';
        document.getElementById('forgotBox').style.display = type === 'forgot' ? 'block' : 'none';
    }

    function register() {
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPass').value;
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        }).then(r => r.json()).then(d => {
            if (d.success) {
                currentUser = d.user;
                localStorage.setItem('user', JSON.stringify(d.user));
                document.getElementById('authScreen').style.display = 'none';
                updateUserData();
            } else alert(d.message);
        });
    }

    function login() {
        const phone = document.getElementById('loginPhone').value;
        const password = document.getElementById('loginPass').value;
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        }).then(r => r.json()).then(d => {
            if (d.success) {
                currentUser = d.user;
                localStorage.setItem('user', JSON.stringify(d.user));
                document.getElementById('authScreen').style.display = 'none';
                updateUserData();
            } else alert(d.message);
        });
    }

    function updateUserData() {
        if (!currentUser) return;
        document.getElementById('userGameId').innerText = 'ID: ' + currentUser.gameId;
        document.getElementById('userBalance').innerText = currentUser.balance.toFixed(2);
        loadHistory();
    }

    socket.on('timer-update', data => {
        document.getElementById('timer').innerText = '00:' + (data.timer < 10 ? '0' : '') + data.timer;
        document.getElementById('periodNo').innerText = data.period;
    });

    function submitDeposit() {
        const amount = document.getElementById('depAmount').value;
        const utr = document.getElementById('depUtr').value;
        fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentUser.phone, amount, utr })
        }).then(r => r.json()).then(d => {
            alert(d.message);
            if (d.success) {
                document.getElementById('depositModal').style.display = 'none';
                loadHistory();
            }
        });
    }

    function submitWithdraw() {
        const amount = document.getElementById('wdAmount').value;
        const bankName = document.getElementById('wdBank').value;
        const holderName = document.getElementById('wdHolder').value;
        const accountNumber = document.getElementById('wdAccount').value;
        const ifscCode = document.getElementById('wdIfsc').value;

        fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentUser.phone, amount, bankName, holderName, accountNumber, ifscCode })
        }).then(r => r.json()).then(d => {
            alert(d.message);
            if (d.success) {
                document.getElementById('withdrawModal').style.display = 'none';
                loadHistory();
            }
        });
    }

    function loadHistory() {
        if (!currentUser) return;
        fetch('/api/history?phone=' + currentUser.phone)
            .then(r => r.json())
            .then(d => {
                let html = '';
                d.deposits.forEach(dep => {
                    const statusClass = dep.status === 'Approved' ? 'status-success' : 'status-pending';
                    html += \`<div class="history-item"><span>Deposit ₹\${dep.amount} (UTR: \${dep.utr})</span><span class="\${statusClass}">\${dep.status}</span></div>\`;
                });
                d.withdrawals.forEach(w => {
                    const statusClass = w.status === 'Approved' ? 'status-success' : 'status-pending';
                    html += \`<div class="history-item"><span>Withdrawal ₹\${w.amount}</span><span class="\${statusClass}">\${dep?.status || w.status}</span></div>\`;
                });
                document.getElementById('txHistory').innerHTML = html || '<div style="color:#666; padding: 10px 0;">No history found</div>';
            });
    }
</script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`24/7 Live Game Server running on port ${PORT}`);
});
