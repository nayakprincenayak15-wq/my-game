const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminPath)) {
    let html = fs.readFileSync(adminPath, 'utf8');
    
    // Let's add a script that intercepts withdrawal rendering and injects Bank Details column/icon
    const bankViewInjection = `
    <script>
    // Robust patch to inject Bank Details in Withdrawals table
    const originalRenderWithdrawals = window.renderWithdrawals || function() {};
    // We observe DOM changes in withdrawals section and add bank details view
    const observer = new MutationObserver(() => {
        const withdrawalRows = document.querySelectorAll('#withdrawalsTable tr, .withdrawal-row, div');
        withdrawalRows.forEach(row => {
            if (row.innerText && row.innerText.includes('Pending') && !row.querySelector('.bank-info-btn')) {
                // Try to find if we can append bank details or a view button
                const actionTd = row.querySelector('td:last-child') || row;
                if (actionTd && !actionTd.dataset.bankPatched) {
                    actionTd.dataset.bankPatched = "true";
                    const btn = document.createElement('button');
                    btn.innerText = '🏦 Bank Details';
                    btn.className = 'bank-info-btn';
                    btn.style.cssText = 'background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-right: 5px; cursor: pointer; font-size: 11px;';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        // Find phone number from the row text
                        const text = row.innerText;
                        const phoneMatch = text.match(/\\d{10}/);
                        const phone = phoneMatch ? phoneMatch[0] : 'Unknown';
                        alert('Fetching Bank Details for Phone: ' + phone + '\\n(Make sure user submitted bank details during withdrawal)');
                    };
                    actionTd.prepend(btn);
                }
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    </script>
    `;

    if (!html.includes('Robust patch to inject Bank Details')) {
        html = html.replace('</body>', bankViewInjection + '</body>');
        fs.writeFileSync(adminPath, html, 'utf8');
        console.log("Admin withdrawal bank view button injected successfully!");
    }
}
