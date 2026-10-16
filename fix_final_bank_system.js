const fs = require('fs');

// 1. Update server.js to ensure the bank info API works perfectly
if (fs.existsSync('server.js')) {
    let serverCode = fs.readFileSync('server.js', 'utf8');
    
    // Add a foolproof bank info route if not present
    if (!serverCode.includes('/api/admin/bank-info')) {
        const newRoute = `
app.get('/api/admin/bank-info', (req, res) => {
    try {
        const { phone } = req.query;
        const db = loadDB();
        const user = db.users.find(u => u.phone === phone);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({
            success: true,
            phone: user.phone,
            bank: user.bank || {
                holder: user.holder || 'N/A',
                bankName: user.bankName || 'N/A',
                accountNumber: user.accountNumber || 'N/A',
                ifsc: user.ifsc || 'N/A'
            }
        });
    } catch(e) {
        res.json({ success: false, error: e.message });
    }
});
`;
        serverCode += '\n' + newRoute;
        fs.writeFileSync('server.js', serverCode, 'utf8');
        console.log("Server.js updated with robust bank-info route.");
    }
}

// 2. Fix frontend search fetch URL in admin.html
if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');
    
    // Replace the fetch call to use the direct clean endpoint
    const searchScriptReplacement = `
    <script>
    function fetchUserBankDetails() {
        const phone = document.getElementById('bankSearchPhone').value.trim();
        const display = document.getElementById('bankDetailsDisplay');
        if (!phone) {
            alert("Kripya Phone Number dalein!");
            return;
        }
        display.style.display = 'block';
        display.innerHTML = '<div style="color:#f59e0b;">Fetching bank details...</div>';

        fetch('/api/admin/bank-info?phone=' + encodeURIComponent(phone))
            .then(res => res.json())
            .then(data => {
                if (data && data.success && data.bank) {
                    display.innerHTML = \`
                        <div style="color:#10b981; font-weight:bold; margin-bottom:5px;">✅ Bank Details Found:</div>
                        <b>Holder Name:</b> \${data.bank.holder || 'N/A'}<br>
                        <b>Bank Name:</b> \${data.bank.bankName || 'N/A'}<br>
                        <b>Account No:</b> \${data.bank.accountNumber || 'N/A'}<br>
                        <b>IFSC Code:</b> \${data.bank.ifsc || 'N/A'}
                    \`;
                } else {
                    display.innerHTML = '<div style="color:#ef4444;">❌ Is number ki bank details nahi mili.</div>';
                }
            })
            .catch(err => {
                display.innerHTML = '<div style="color:#ef4444;">❌ Server connection error.</div>';
            });
    }
    </script>
    `;

    // Remove old conflicting search scripts and insert clean one
    html = html.replace(/<script>[\s\S]*?fetchUserBankDetails[\s\S]*?<\/script>/gi, '');
    html = html.replace('</body>', searchScriptReplacement + '\n</body>');

    fs.writeFileSync('admin.html', html, 'utf8');
    console.log("Admin panel bank search script fixed successfully.");
}
