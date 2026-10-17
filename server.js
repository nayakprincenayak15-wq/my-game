const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express({ limit: '10mb' });
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: {}, history: [], settings: { notice: 'Welcome to maan.win!', tg: 'https://t.me/support', qr: '' }, bets: [], deposits: [], withdrawals: [] };

if (fs.existsSync(DB_PATH)) {
    try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }; } catch(e){}
}
function saveDB() {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch(e){}
}

let forcedNum = null;
let currentPeriod = "20261016000522";
let timerSeconds = 30;

setInterval(() => {
    let now = new Date();
    let seconds = now.getSeconds();
    timerSeconds = 30 - (seconds % 30);
    let p = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + seconds) / 30).toString().padStart(6, '0');
    
    if (currentPeriod !== p) {
        let activePeriod = currentPeriod;
        currentPeriod = p;
        
        let winNum = (forcedNum !== null && forcedNum !== undefined) ? forcedNum : Math.floor(Math.random() * 10);
        forcedNum = null;
        let winResult = winNum >= 5 ? "Big" : "Small";
        
        if (!db.history) db.history = [];
        db.history.unshift({ period: activePeriod, num: winNum, result: winResult });

        if (db.bets) {
            db.bets.forEach(b => {
                if (b.period === activePeriod && b.status === 'Pending') {
                    let isWin = false;
                    let mult = b.multiplier || 2;

                    if (b.choice === 'Green' && (winNum % 2 !== 0 && winNum !== 5)) isWin = true;
                    else if (b.choice === 'Red' && (winNum % 2 === 0 && winNum !== 0)) isWin = true;
                    else if (b.choice === 'Violet' && (winNum === 0 || winNum === 5)) isWin = true;
                    else if (b.choice === 'Big' && winResult === 'Big') isWin = true;
                    else if (b.choice === 'Small' && winResult === 'Small') isWin = true;
                    else if (b.choice === winNum.toString()) isWin = true;

                    if (isWin) {
                        b.status = 'Win';
                        let finalMult = Number(b.multiplier) > 1 ? Number(b.multiplier) : 2;
                                  b.winAmt = Number(b.amount) * finalMult;
                        if (db.users[b.phone]) db.users[b.phone].balance += b.winAmt;
                    } else {
                        b.status = 'Loss';
                        b.winAmt = 0;
                    }
                }
            });
        }
        saveDB();
    }
}, 1000);

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

app.post('/api/register', (req, res) => {
    const { phone, password, referredBy } = req.body;
    if (!db.users) db.users = {};
    if (db.users[phone]) return res.json({ success: false, message: "Phone number already registered!" });
    let customId = "MW" + Math.floor(100000 + Math.random() * 900000);
    db.users[phone] = { phone, password, balance: 0, customId, referredBy: referredBy || '', totalDeposit: 0, totalWagered: 0, blocked: false, balanceLogs: [] };
    saveDB();
    res.json({ success: true, user: db.users[phone] });
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users || !db.users[phone] || db.users[phone].password !== password) {
        return res.json({ success: false, message: "Invalid credentials!" });
    }
    if (db.users[phone].blocked) return res.json({ success: false, message: "Your account is blocked!" });
    res.json({ success: true, user: db.users[phone] });
});

app.get('/api/game-state', (req, res) => {
    let phone = req.query.phone;
    let userBal = db.users[phone] ? db.users[phone].balance : undefined;
    let myBets = (db.bets || []).filter(b => b.phone === phone).reverse();
    res.json({ 
        period: currentPeriod, 
        timer: timerSeconds, 
        history: db.history || [], 
        notice: db.settings.notice, 
        tg: db.settings.tg || 'https://t.me/support', 
        qr: db.settings.qr || '', 
        userBalance: userBal, 
        myBets: myBets 
    });
});

app.post('/api/bet', (req, res) => {
    const { phone, amount, choice, multiplier } = req.body;
    if (!db.users[phone] || db.users[phone].balance < amount) return res.json({ success: false, message: "Insufficient balance!" });
    db.users[phone].balance -= amount;
    if (db.users[phone].totalWagered === undefined) db.users[phone].totalWagered = 0;
    db.users[phone].totalWagered += Number(amount);
    if (!db.bets) db.bets = [];
    db.bets.push({ phone, amount, choice, multiplier, period: currentPeriod, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Bet placed successfully!" });
});

app.post('/api/deposit', (req, res) => {
    const { phone, amount, utr } = req.body;
    let amtNum = Number(amount);
    if (amtNum < 100) return res.json({ success: false, message: "Minimum Deposit is ₹100!" });
    if (!db.deposits) db.deposits = [];
    db.deposits.push({ phone, amount: amtNum, utr, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Deposit request submitted successfully!" });
});

app.post('/api/withdraw', (req, res) => {
    const { phone, amt, bank, holder, acc, ifsc } = req.body;
    let wdAmt = Number(amt);
    if (wdAmt < 100) return res.json({ success: false, message: "Minimum Withdrawal is ₹100!" });
    let u = db.users[phone];
    if (!u) return res.json({ success: false, message: "User not found!" });
    if (u.balance < wdAmt) return res.json({ success: false, message: "Insufficient balance for withdrawal!" });
    
    let totalDep = u.totalDeposit || 0;
    let totalWag = u.totalWagered || 0;
    if (totalWag < totalDep) return res.json({ success: false, message: `Please complete game play of remaining ₹${totalDep - totalWag} before withdrawal!` });
    
    u.balance -= wdAmt;
    if (!db.withdrawals) db.withdrawals = [];
    db.withdrawals.push({ phone, amt: wdAmt, bank, holder, acc, ifsc, status: 'Pending', time: new Date() });
    saveDB();
    res.json({ success: true, message: "Withdrawal request submitted successfully!" });
});

app.get('/api/user-deposits', (req, res) => {
    let list = (db.deposits || []).filter(d => d.phone === req.query.phone).reverse();
    res.json({ deposits: list });
});

app.get('/api/user-withdrawals', (req, res) => {
    let list = (db.withdrawals || []).filter(w => w.phone === req.query.phone).reverse();
    res.json({ withdrawals: list });
});

// ADMIN APIS
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Prince' && password === '6396714538') {
        res.json({ success: true, key: 'SEC_ADM_8899' });
    } else {
        res.json({ success: false, message: "Invalid Admin Credentials!" });
    }
});

app.get('/api/admin/data', (req, res) => {
    if (req.query.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let uList = Object.values(db.users || {});
    let curBets = (db.bets || []).filter(b => b.period === currentPeriod).reverse();
    let refList = uList.filter(u => u.referredBy).map(u => ({ referrer: u.referredBy, referred: u.phone }));
    res.json({
        success: true,
        period: currentPeriod,
        timer: timerSeconds,
        onlineUsers: uList.length,
        totalReg: uList.length,
        forcedResult: forcedNum,
        users: uList,
        deposits: db.deposits || [],
        withdrawals: db.withdrawals || [],
        referrals: refList,
        liveBets: curBets,
        settings: db.settings || {}
    });
});

app.get('/api/admin/user-details', (req, res) => {
    if (req.query.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let phone = req.query.phone;
    let u = db.users[phone];
    if (!u) return res.json({ success: false, message: "User not found!" });
    let uBets = (db.bets || []).filter(b => b.phone === phone).reverse();
    let uDeps = (db.deposits || []).filter(d => d.phone === phone).reverse();
    let uWds = (db.withdrawals || []).filter(w => w.phone === phone).reverse();
    res.json({ success: true, user: u, bets: uBets, deposits: uDeps, withdrawals: uWds });
});

app.post('/api/admin/edit-balance', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let { phone, amount } = req.body;
    let u = db.users[phone];
    if (u) {
        u.balance += Number(amount);
        if (!u.balanceLogs) u.balanceLogs = [];
        u.balanceLogs.unshift({ type: amount >= 0 ? 'Admin Credit' : 'Admin Debit', amount: Math.abs(amount), time: new Date().toLocaleString() });
        saveDB();
        res.json({ success: true, message: "User balance updated successfully!" });
    } else {
        res.json({ success: false, message: "User not found!" });
    }
});

app.post('/api/admin/force-result', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    forcedNum = Number(req.body.num);
    res.json({ success: true, message: `Result forced to ${forcedNum} for next period!` });
});

app.post('/api/admin/settings', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    if (req.body.notice !== undefined) db.settings.notice = req.body.notice;
    if (req.body.tg !== undefined) db.settings.tg = req.body.tg;
    if (req.body.qr !== undefined) db.settings.qr = req.body.qr;
    saveDB();
    res.json({ success: true });
});

app.post('/api/admin/update-deposit', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let { index, status } = req.body;
    let dep = db.deposits[index];
    if (dep && dep.status === 'Pending') {
        dep.status = status;
        if (status === 'Approved' && db.users[dep.phone]) {
            db.users[dep.phone].balance += Number(dep.amount);
            if (!db.users[dep.phone].totalDeposit) db.users[dep.phone].totalDeposit = 0;
            db.users[dep.phone].totalDeposit += Number(dep.amount);
            if (!db.users[dep.phone].balanceLogs) db.users[dep.phone].balanceLogs = [];
            db.users[dep.phone].balanceLogs.unshift({ type: 'Deposit Approved', amount: dep.amount, time: new Date().toLocaleString() });
        }
        saveDB();
    }
    res.json({ success: true, message: "Deposit " + status });
});

app.post('/api/admin/update-withdraw', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let { index, status } = req.body;
    let wd = db.withdrawals[index];
    if (wd && wd.status === 'Pending') {
        wd.status = status;
        if (status === 'Rejected' && db.users[wd.phone]) {
            db.users[wd.phone].balance += Number(wd.amt);
            if (!db.users[wd.phone].balanceLogs) db.users[wd.phone].balanceLogs = [];
            db.users[wd.phone].balanceLogs.unshift({ type: 'Withdrawal Rejected (Refunded)', amount: wd.amt, time: new Date().toLocaleString() });
        } else if (status === 'Approved' && db.users[wd.phone]) {
            if (!db.users[wd.phone].balanceLogs) db.users[wd.phone].balanceLogs = [];
            db.users[wd.phone].balanceLogs.unshift({ type: 'Withdrawal Approved', amount: wd.amt, time: new Date().toLocaleString() });
        }
        saveDB();
    }
    res.json({ success: true, message: "Withdrawal " + status });
});

app.post('/api/admin/toggle-block', (req, res) => {
    if (req.body.key !== 'SEC_ADM_8899') return res.json({ success: false });
    let u = db.users[req.body.phone];
    if (u) { u.blocked = !u.blocked; saveDB(); }
    res.json({ success: true, message: "User status updated" });
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });



    }
    const db = loadDB();
    const user = db.users.find(u => u.phone === phone);
    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }
    const bank = user.bank || (user.bankDetails ? user.bankDetails : null);
    res.json({
        success: true,
        phone: user.phone,
        bank: bank || {
            holder: user.holder || 'N/A',
            bankName: user.bankName || 'N/A',
            accountNumber: user.accountNumber || 'N/A',
            ifsc: user.ifsc || 'N/A'
        }
    });
});



        }
        
        // Read database safely
        let dbData = { users: [] };
        if (fs.existsSync('db.json')) {
            dbData = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        } else if (typeof loadDB === 'function') {
            dbData = loadDB();
        }

        const user = (dbData.users || []).find(u => String(u.phone).trim() === String(phone).trim());
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const bankInfo = user.bank || user.bankDetails || {
            holder: user.holder || user.name || 'N/A',
            bankName: user.bankName || 'N/A',
            accountNumber: user.accountNumber || 'N/A',
            ifsc: user.ifsc || 'N/A'
        };

        return res.json({
            success: true,
            phone: user.phone,
            bank: bankInfo
        });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
});



        }
        let db = { users: [] };
        if (fs.existsSync('db.json')) {
            db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        }
        const foundUser = (db.users || []).find(u => String(u.phone) === String(phoneKey));
        if (!foundUser) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({
            success: true,
            phone: foundUser.phone,
            bank: foundUser.bank || foundUser.bankDetails || {
                holder: foundUser.holder || foundUser.name || 'N/A',
                bankName: foundUser.bankName || 'N/A',
                accountNumber: foundUser.accountNumber || 'N/A',
                ifsc: foundUser.ifsc || 'N/A'
            }
        });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});



        
        if (!fs.existsSync('db.json')) {
            return res.json({ success: false, message: "db.json not found" });
        }
        
        const raw = fs.readFileSync('db.json', 'utf8');
        const db = JSON.parse(raw);
        const users = db.users || [];
        
        const target = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!target) {
            return res.json({ success: false, message: "User not found in db" });
        }

        const bankData = target.bank || target.bankDetails || {
            holder: target.holder || target.name || 'N/A',
            bankName: target.bankName || 'N/A',
            accountNumber: target.accountNumber || 'N/A',
            ifsc: target.ifsc || 'N/A'
        };

        res.json({
            success: true,
            phone: target.phone,
            bank: bankData
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});



        
        if (!fs.existsSync('db.json')) {
            return res.json({ success: false, message: "Database not found" });
        }
        
        const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        const users = db.users || [];
        const withdrawals = db.withdrawals || [];
        
        const targetUser = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!targetUser) {
            return res.json({ success: false, message: "User not found" });
        }

        // Find user's withdrawal requests
        const userWithdrawals = withdrawals.filter(w => String(w.phone).trim() === String(phone).trim());

        const bankData = targetUser.bank || targetUser.bankDetails || {
            holder: targetUser.holder || targetUser.name || 'N/A',
            bankName: targetUser.bankName || 'N/A',
            accountNumber: targetUser.accountNumber || 'N/A',
            ifsc: targetUser.ifsc || 'N/A'
        };

        res.json({
            success: true,
            phone: targetUser.phone,
            bank: bankData,
            withdrawals: userWithdrawals
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});


// --- Safe Bank Info API ---

        
        const database = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        const userList = database.users || [];
        const withdrawalList = database.withdrawals || [];
        
        const matchedUser = userList.find(u => String(u.phone).trim() === String(phoneKey).trim());
        if (!matchedUser) {
            return res.json({ success: false, message: "User not found" });
        }

        const matchedWithdrawals = withdrawalList.filter(w => String(w.phone).trim() === String(phoneKey).trim());

        const bankDetailsObj = matchedUser.bank || matchedUser.bankDetails || {
            holder: matchedUser.holder || matchedUser.name || 'N/A',
            bankName: matchedUser.bankName || 'N/A',
            accountNumber: matchedUser.accountNumber || 'N/A',
            ifsc: matchedUser.ifsc || 'N/A'
        };

        return res.json({
            success: true,
            phone: matchedUser.phone,
            bank: bankDetailsObj,
            withdrawals: matchedWithdrawals
        });
    } catch (ex) {
        return res.json({ success: false, error: ex.message });
    }
});

app.get("/api/admin/bank-info", (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "Phone required" });
        if (!fs.existsSync("db.json")) return res.json({ success: false, message: "db.json missing" });
        
        const db = JSON.parse(fs.readFileSync("db.json", "utf8"));
        const users = db.users || [];
        const withdrawals = db.withdrawals || [];
        
        const user = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!user) return res.json({ success: false, message: "User not found" });
        
        const userWithdrawals = withdrawals.filter(w => String(w.phone).trim() === String(phone).trim());
        const bank = user.bank || user.bankDetails || {
            holder: user.holder || user.name || "N/A",
            bankName: user.bankName || "N/A",
            accountNumber: user.accountNumber || "N/A",
            ifsc: user.ifsc || "N/A"
        };
        
        return res.json({ success: true, phone: user.phone, bank: bank, withdrawals: userWithdrawals });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
});

app.get('/api/admin/user-history', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "Phone required" });
        if (!fs.existsSync('db.json')) return res.json({ success: false, message: "db.json missing" });
        
        const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        const users = db.users || [];
        const withdrawals = db.withdrawals || [];
        const deposits = db.deposits || [];
        const bets = db.bets || [];
        
        const user = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!user) return res.json({ success: false, message: "User not found" });
        
        const userWithdrawals = withdrawals.filter(w => String(w.phone).trim() === String(phone).trim());
        const userDeposits = deposits.filter(d => String(d.phone).trim() === String(phone).trim());
        const userBets = bets.filter(b => String(b.phone).trim() === String(phone).trim());
        
        const bank = user.bank || user.bankDetails || {
            holder: user.holder || user.name || 'N/A',
            bankName: user.bankName || 'N/A',
            accountNumber: user.accountNumber || 'N/A',
            ifsc: user.ifsc || 'N/A'
        };
        
        return res.json({
            success: true,
            user: {
                phone: user.phone,
                balance: user.balance || 0,
                referredBy: user.referredBy || 'None',
                bank: bank
            },
            withdrawals: userWithdrawals,
            deposits: userDeposits,
            bets: userBets,
            logs: user.logs || []
        });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }

app.get('/api/admin/user-history', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "Phone required" });
        if (!fs.existsSync('db.json')) return res.json({ success: false, message: "db.json missing" });
        
        const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        const users = db.users || [];
        const withdrawals = db.withdrawals || [];
        const deposits = db.deposits || [];
        const bets = db.bets || [];
        
        const user = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!user) return res.json({ success: false, message: "User not found" });
        
        const userWithdrawals = withdrawals.filter(w => String(w.phone).trim() === String(phone).trim());
        const userDeposits = deposits.filter(d => String(d.phone).trim() === String(phone).trim());
        const userBets = bets.filter(b => String(b.phone).trim() === String(phone).trim());
        
        const bank = user.bank || user.bankDetails || {
            holder: user.holder || user.name || 'N/A',
            bankName: user.bankName || 'N/A',
            accountNumber: user.accountNumber || 'N/A',
            ifsc: user.ifsc || 'N/A'
        };
        
        return res.json({
            success: true,
            user: {
                phone: user.phone,
                balance: user.balance || 0,
                referredBy: user.referredBy || 'None',
                bank: bank
            },
            withdrawals: userWithdrawals,
            deposits: userDeposits,
            bets: userBets,
            logs: user.logs || []
        });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }


app.get('/api/admin/user-history', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "Phone required" });
        if (!fs.existsSync('db.json')) return res.json({ success: false, message: "db.json missing" });
        
        const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        const users = db.users || [];
        const withdrawals = db.withdrawals || [];
        const deposits = db.deposits || [];
        const bets = db.bets || [];
        
        const user = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!user) return res.json({ success: false, message: "User not found" });
        
        const userWithdrawals = withdrawals.filter(w => String(w.phone).trim() === String(phone).trim());
        const userDeposits = deposits.filter(d => String(d.phone).trim() === String(phone).trim());
        const userBets = bets.filter(b => String(b.phone).trim() === String(phone).trim());
        
        const bank = user.bank || user.bankDetails || {
            holder: user.holder || user.name || 'N/A',
            bankName: user.bankName || 'N/A',
            accountNumber: user.accountNumber || 'N/A',
            ifsc: user.ifsc || 'N/A'
        };
        
        return res.json({
            success: true,
            user: {
                phone: user.phone,
                balance: user.balance || 0,
                referredBy: user.referredBy || 'None',
                bank: bank
            },
            withdrawals: userWithdrawals,
            deposits: userDeposits,
            bets: userBets,
            logs: user.logs || []
        });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
});

app.get('/api/admin/user-history', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "Phone required" });
        if (!fs.existsSync('db.json')) return res.json({ success: false, message: "db.json missing" });
        
        const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
        const users = db.users || [];
        const withdrawals = db.withdrawals || [];
        const deposits = db.deposits || [];
        const bets = db.bets || [];
        
        const user = users.find(u => String(u.phone).trim() === String(phone).trim());
        if (!user) return res.json({ success: false, message: "User not found" });
        
        const userWithdrawals = withdrawals.filter(w => String(w.phone).trim() === String(phone).trim());
        const userDeposits = deposits.filter(d => String(d.phone).trim() === String(phone).trim());
        const userBets = bets.filter(b => String(b.phone).trim() === String(phone).trim());
        
        const bank = user.bank || user.bankDetails || {
            holder: user.holder || user.name || 'N/A',
            bankName: user.bankName || 'N/A',
            accountNumber: user.accountNumber || 'N/A',
            ifsc: user.ifsc || 'N/A'
        };
        
        return res.json({
            success: true,
            user: {
                phone: user.phone,
                balance: user.balance || 0,
                referredBy: user.referredBy || 'None',
                bank: bank
            },
            withdrawals: userWithdrawals,
            deposits: userDeposits,
            bets: userBets,
            logs: user.logs || []
        });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
