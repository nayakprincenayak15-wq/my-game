const fs = require('fs');

if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');

    const updatedScript = `
    <script>
    function fetchUserBankDetails() {
        const phoneInput = document.getElementById('bankSearchPhone');
        const display = document.getElementById('bankDetailsDisplay');
        if (!phoneInput) return;
        const phone = phoneInput.value.trim();
        if (!phone) {
            alert("Kripya Phone Number darj karein!");
            return;
        }
        
        display.style.display = 'block';
        display.innerHTML = '<div style="color:#f59e0b;">Fetching bank details...</div>';

        fetch('/api/admin/bank-info?key=' + (window.admKey || '') + '&phone=' + encodeURIComponent(phone))
            .then(res => res.json())
            .then(data => {
                if (data && data.success && data.bank) {
                    display.innerHTML = \`
                        <div style="color:#10b981; font-weight:bold; margin-bottom:8px;">✅ User Bank Details (\${data.phone}):</div>
                        <div style="line-height:1.6;">
                            <b>Account Holder:</b> \${data.bank.holder || 'N/A'}<br>
                            <b>Bank Name:</b> \${data.bank.bankName || 'N/A'}<br>
                            <b>Account Number:</b> \${data.bank.accountNumber || 'N/A'}<br>
                            <b>IFSC Code:</b> \${data.bank.ifsc || 'N/A'}
                        </div>
                    \`;
                } else {
                    display.innerHTML = '<div style="color:#ef4444;">❌ Details nahi mili. Account missing or empty.</div>';
                }
            })
            .catch(err => {
                display.innerHTML = '<div style="color:#ef4444;">❌ Request Failed. Retrying...</div>';
            });
    }
    </script>
    `;

    // Remove older duplicate scripts to prevent blinking loops
    html = html.replace(/<script>[\s\S]*?fetchUserBankDetails[\s\S]*?<\/script>/gi, '');
    html = html.replace('</body>', updatedScript + '\n</body>');

    fs.writeFileSync('admin.html', html, 'utf8');
    console.log("Search functionality linked to /api/admin/bank-info.");
}
