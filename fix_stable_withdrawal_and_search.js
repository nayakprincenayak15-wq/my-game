const fs = require('fs');

if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');

    // 1. Clean up and inject a stable, non-blinking dedicated bank checker section
    const stableBankSection = `
    <!-- Stable Non-Blinking Bank Details Search Box -->
    <div class="card" style="margin-top:20px; border: 1px solid #10b981; background: #0b1329;">
        <h4 style="color:#10b981; margin-top:0; font-size:16px;">🔍 Check Withdrawal Bank Details</h4>
        <p style="font-size:12px; color:#94a3b8; margin-bottom:10px;">User ka phone number daal kar check karein ki usne withdrawal mein kaun sa account diya hai.</p>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <input type="text" id="withdrawalSearchPhone" placeholder="Enter Phone Number" style="flex:1; padding:10px; border-radius:6px; border:1px solid #1e2d54; background:#070d1b; color:#fff; font-size:14px;">
            <button onclick="searchWithdrawalBank()" style="padding:10px 20px; background:#10b981; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Check</button>
        </div>
        <div id="withdrawalBankResult" style="background:#070d1b; padding:12px; border-radius:6px; font-size:13px; color:#e2e8f0; display:none; border:1px solid #1e2d54; line-height:1.6;">
            <!-- Bank Details will appear here -->
        </div>
    </div>
    `;

    // 2. Add the secure search function script
    const searchScript = `
    <script>
    function searchWithdrawalBank() {
        const phone = document.getElementById('withdrawalSearchPhone').value.trim();
        const resBox = document.getElementById('withdrawalBankResult');
        if (!phone) {
            alert("Kripya phone number darj karein!");
            return;
        }
        resBox.style.display = 'block';
        resBox.innerHTML = '<span style="color:#f59e0b;">Searching bank details...</span>';

        fetch('/api/admin/bank-info?phone=' + encodeURIComponent(phone))
            .then(res => res.json())
            .then(data => {
                if (data && data.success && data.bank) {
                    resBox.innerHTML = \`
                        <div style="color:#10b981; font-weight:bold; margin-bottom:6px;">✅ Withdrawal Bank Account Found:</div>
                        <b>Holder Name:</b> \${data.bank.holder || 'N/A'}<br>
                        <b>Bank Name:</b> \${data.bank.bankName || 'N/A'}<br>
                        <b>Account No:</b> \${data.bank.accountNumber || 'N/A'}<br>
                        <b>IFSC Code:</b> \${data.bank.ifsc || 'N/A'}
                    \`;
                } else {
                    resBox.innerHTML = '<span style="color:#ef4444;">❌ Is number par koi bank details nahi mili.</span>';
                }
            })
            .catch(err => {
                resBox.innerHTML = '<span style="color:#ef4444;">❌ Connection error. Try again.</span>';
            });
    }
    </script>
    `;

    // Insert right before closing body safely without touching login logic
    if (!html.includes('searchWithdrawalBank')) {
        html = html.replace('</body>', stableBankSection + '\n' + searchScript + '\n</body>');
        fs.writeFileSync('admin.html', html, 'utf8');
        console.log("Stable bank search box added successfully.");
    }
}
