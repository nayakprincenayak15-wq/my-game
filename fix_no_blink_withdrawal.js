const fs = require('fs');

if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');

    // 1. Remove any intervals, blinking loops, or old observers completely
    html = html.replace(/<script>[\s\S]*?MutationObserver[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script>[\s\S]*?setInterval[\s\S]*?<\/script>/gi, '');

    // 2. Insert a clean, static, non-blinking global bank details viewer function
    const fixedScript = `
    <script>
    // Static Non-Blinking Bank Details Handler for Withdrawals
    if (typeof window.viewBankDetails !== 'function') {
        window.viewBankDetails = function(holder, bank, acc, ifsc) {
            alert("🏦 WITHDRAWAL BANK DETAILS\\n" +
                  "-------------------------------------\\n" +
                  "Holder Name : " + (holder || 'N/A') + "\\n" +
                  "Bank Name   : " + (bank || 'N/A') + "\\n" +
                  "Account No  : " + (acc || 'N/A') + "\\n" +
                  "IFSC Code   : " + (ifsc || 'N/A'));
        };
    }
    </script>
    `;

    if (!html.includes('viewBankDetails')) {
        html = html.replace('</body>', fixedScript + '</body>');
    }

    fs.writeFileSync('admin.html', html, 'utf8');
    console.log("Withdrawals panel cleaned and stabilized without any blinking!");
}
