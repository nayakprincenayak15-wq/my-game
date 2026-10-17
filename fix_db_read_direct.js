const fs = require('fs');

if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');

    // Replace bank-info endpoint with direct raw fs read of db.json
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);\s*\}\);\}/g, '');
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);/g, '');

    const directRoute = `
app.get('/api/admin/bank-info', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "No phone" });
        
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
`;

    code += '\n' + directRoute;
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Direct db.json reader attached.");
}
