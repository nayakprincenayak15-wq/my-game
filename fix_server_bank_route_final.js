const fs = require('fs');

if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');

    // Remove any broken/duplicate bank-info routes first
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\);\}\);\}/g, '');
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);/g, '');

    // Add a clean, guaranteed working bank-info API route
    const foolproofRoute = `
app.get('/api/admin/bank-info', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) {
            return res.json({ success: false, message: "Phone required" });
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
`;

    code += '\n' + foolproofRoute;
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Foolproof bank-info API route added to server.js");
}
