const fs = require('fs');

if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');

    // Clean all previously injected broken bank-info blocks
    // We remove everything from app.get('/api/admin/bank-info' up to the closing brackets
    while (code.includes('/api/admin/bank-info')) {
        let start = code.indexOf("app.get('/api/admin/bank-info'");
        if (start === -1) start = code.indexOf('app.get("/api/admin/bank-info"');
        if (start === -1) break;
        
        // Find a reasonable chunk to remove (e.g. 1500 chars or until next app.get / app.listen)
        let end = code.indexOf("});", start);
        if (end !== -1) {
            code = code.substring(0, start) + code.substring(end + 3);
        } else {
            break;
        }
    }

    // Now add a clean, 100% syntactically correct bank-info route right at the end
    const cleanBlock = `
// --- Safe Bank Info API ---
app.get('/api/admin/bank-info', (req, res) => {
    try {
        const phoneKey = req.query.phone;
        if (!phoneKey) return res.json({ success: false, message: "Phone required" });
        
        if (!fs.existsSync('db.json')) {
            return res.json({ success: false, message: "db.json missing" });
        }
        
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
`;

    code += '\n' + cleanBlock;
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Server.js cleaned and updated.");
}
