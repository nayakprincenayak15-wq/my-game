const fs = require('fs');

if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');

    // Dedicated clean HTML card for searching user bank details separately
    const bankCheckerCard = `
    <!-- Dedicated Separate Bank Details Checker -->
    <div class="card" style="margin-top:15px; border: 1px solid #3b82f6;">
        <h4 style="color:#3b82f6; margin-top:0;">🏦 Check User Bank Details</h4>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <input type="text" id="bankSearchPhone" placeholder="Enter User Phone Number" style="flex:1; padding:8px; border-radius:6px; border:1px solid #1e2d54; background:#0b1329; color:#fff;">
            <button onclick="fetchUserBankDetails()" style="padding:8px 15px; background:#3b82f6; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Search</button>
        </div>
        <div id="bankDetailsDisplay" style="background:#0b1329; padding:10px; border-radius:6px; font-size:13px; color:#e2e8f0; display:none;">
            <!-- Bank Details Output -->
        </div>
    </div>
    `;

    // JavaScript handler function for searching bank details safely
    const bankCheckerScript = `
    <script>
    function fetchUserBankDetails() {
        const phone = document.getElementById('bankSearchPhone').value.trim();
        const display = document.getElementById('bankDetailsDisplay');
        if (!phone) {
            alert("Kripya User Phone Number darj karein!");
            return;
        }
        display.style.display = 'block';
        display.innerHTML = '<i>Loading details...</i>';
        
        fetch(\`/api/admin/user-details?key=\${window.admKey || ''}&phone=\${phone}\`)
            .then(r => r.json())
            .then(d => {
                if (d && d.bank) {
                    display.innerHTML = \`
                        <div style="color:#10b981; font-weight:bold; margin-bottom:5px;">✅ User Bank Account Found:</div>
                        <b>Holder Name:</b> \${d.bank.holder || 'N/A'}<br>
                        <b>Bank Name:</b> \${d.bank.bankName || 'N/A'}<br>
                        <b>Account No:</b> \${d.bank.accountNumber || 'N/A'}<br>
                        <b>IFSC Code:</b> \${d.bank.ifsc || 'N/A'}
                    \`;
                } else if (d && d.user && d.user.bank) {
                    display.innerHTML = \`
                        <div style="color:#10b981; font-weight:bold; margin-bottom:5px;">✅ User Bank Account Found:</div>
                        <b>Holder Name:</b> \${d.user.bank.holder || 'N/A'}<br>
                        <b>Bank Name:</b> \${d.user.bank.bankName || 'N/A'}<br>
                        <b>Account No:</b> \${d.user.bank.accountNumber || 'N/A'}<br>
                        <b>IFSC Code:</b> \${d.user.bank.ifsc || 'N/A'}
                    \`;
                } else {
                    display.innerHTML = '<span style="color:#ef4444;">❌ User ki bank details nahi mili.</span>';
                }
            })
            .catch(err => {
                display.innerHTML = '<span style="color:#ef4444;">❌ Bank details fetch karne mein error aaya.</span>';
            });
    }
    </script>
    `;

    if (!html.includes('Check User Bank Details')) {
        // Insert right before Notice Manager or Users Management safely
        if (html.includes('Notice Manager')) {
            html = html.replace('<div class="card">', bankCheckerCard + '\n<div class="card">');
        } else {
            html = html.replace('</body>', bankCheckerCard + '</body>');
        }
    }

    if (!html.includes('fetchUserBankDetails')) {
        html = html.replace('</body>', bankCheckerScript + '\n</body>');
    }

    fs.writeFileSync('admin.html', html, 'utf8');
    console.log("Separate Bank Details Box added successfully!");
}
