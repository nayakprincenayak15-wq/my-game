const fs = require('fs');

if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');

    // Ensure user details response returns standardized bank object
    const oldEndpoint = `app.get('/api/admin/user-details'`;
    if (code.includes(oldEndpoint)) {
        console.log("Found user-details route in server.js. Verifying bank field structure...");
    }

    // Re-write or update user-details endpoint logic safely
    const customBankRoute = `
app.get('/api/admin/bank-info', (req, res) => {
    const { key, phone } = req.query;
    if (key !== ADMIN_KEY && key !== admKey) {
        return res.status(403).json({ error: "Unauthorized" });
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
`;

    if (!code.includes('/api/admin/bank-info')) {
        code += '\n' + customBankRoute;
        fs.writeFileSync('server.js', code, 'utf8');
        console.log("Dedicated /api/admin/bank-info API added to server.js");
    }
}
