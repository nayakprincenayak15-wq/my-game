const fs = require('fs');

if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');

    // Clean up any broken previous blocks
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);\s*\}\);\}/g, '');
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);/g, '');

    // Add a clean, minimal, bulletproof route
    const cleanRoute = `
app.get('/api/admin/bank-info', (req, res) => {
    try {
        const phoneKey = req.query.phone;
        if (!phoneKey) {
            return res.json({ success: false, message: "Phone required" });
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
`;

    code += '\n' + cleanRoute;
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Clean server.js updated successfully.");
}
