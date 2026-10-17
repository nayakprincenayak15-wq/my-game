const fs = require('fs');

if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');

    // Clean old bank-info routes
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);\s*\}\);\}/g, '');
    code = code.replace(/app\.get\('\/api\/admin\/bank-info'[\s\S]*?\}\);/g, '');

    // Add robust search route that returns bank details + withdrawal request info
    const fullSearchRoute = `
app.get('/api/admin/bank-info', (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.json({ success: false, message: "Phone required" });
        
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
`;

    code += '\n' + fullSearchRoute;
    fs.writeFileSync('server.js', code, 'utf8');
}

// Also update admin.html search box display to show withdrawal amount & status nicely
if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');
    
    // Replace the script handling search response to display withdrawals too
    const newScript = `
    <script>
    function searchWithdrawalBank() {
        const phone = document.getElementById('withdrawalSearchPhone').value.trim();
        const resBox = document.getElementById('withdrawalBankResult');
        if (!phone) {
            alert("Kripya phone number darj karein!");
            return;
        }
        resBox.style.display = 'block';
        resBox.innerHTML = '<span style="color:#f59e0b;">Searching records...</span>';

        fetch('/api/admin/bank-info?phone=' + encodeURIComponent(phone))
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    let wHtml = '';
                    if (data.withdrawals && data.withdrawals.length > 0) {
                        data.withdrawals.forEach(w => {
                            wHtml += \`<div style="margin-top:8px; padding:6px; background:#111c38; border-radius:4px;">
                                <b>Amount:</b> ₹\${w.amount || 0} | <b>Status:</b> <span style="color:\${w.status === 'Approved' ? '#10b981' : w.status === 'Rejected' ? '#ef4444' : '#f59e0b'}">\${w.status || 'Pending'}</span>
                            </div>\`;
                        });
                    } else {
                        wHtml = '<div style="color:#94a3b8; margin-top:6px;">No withdrawal requests found for this number.</div>';
                    }

                    resBox.innerHTML = \`
                        <div style="color:#10b981; font-weight:bold; margin-bottom:6px;">✅ User Details Found:</div>
                        <b>Holder Name:</b> \${data.bank.holder || 'N/A'}<br>
                        <b>Bank Name:</b> \${data.bank.bankName || 'N/A'}<br>
                        <b>Account No:</b> \${data.bank.accountNumber || 'N/A'}<br>
                        <b>IFSC Code:</b> \${data.bank.ifsc || 'N/A'}<br>
                        <div style="margin-top:8px; border-top:1px solid #1e2d54; padding-top:6px; font-weight:bold; color:#38bdf8;">Withdrawal Requests:</div>
                        \${wHtml}
                    \`;
                } else {
                    resBox.innerHTML = '<span style="color:#ef4444;">❌ Is number par koi data nahi mila.</span>';
                }
            })
            .catch(err => {
                resBox.innerHTML = '<span style="color:#ef4444;">❌ Connection error. Try again.</span>';
            });
    }
    </script>
    `;

    // Clean up old script if present and add updated one
    if (html.includes('function searchWithdrawalBank')) {
        // We can just re-inject or let it override since script functions overwrite
    }
    html = html.replace('</body>', newScript + '\n</body>');
    fs.writeFileSync('admin.html', html, 'utf8');
}
