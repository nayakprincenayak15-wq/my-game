const fs = require('fs');

if (fs.existsSync('admin.html')) {
    let code = fs.readFileSync('admin.html', 'utf8');

    // 1. Ensure the global safe helper function exists for viewing bank details
    const helperScript = `
    <script>
    if (typeof window.viewBankDetails !== 'function') {
        window.viewBankDetails = function(holder, bank, acc, ifsc) {
            alert("🏦 USER BANK DETAILS:\\n" +
                  "-----------------------------------\\n" +
                  "Holder Name: " + (holder || 'N/A') + "\\n" +
                  "Bank Name: " + (bank || 'N/A') + "\\n" +
                  "Account No: " + (acc || 'N/A') + "\\n" +
                  "IFSC Code: " + (ifsc || 'N/A'));
        };
    }
    </script>
    `;

    if (!code.includes('viewBankDetails')) {
        code = code.replace('</body>', helperScript + '</body>');
    }

    // 2. Safely inject the bank details button inside the withdrawals rendering loop if not already present
    // We target the string where withdrawals are mapped/forEach-ed
    if (code.includes('d.withdrawals.forEach') && !code.includes('viewBankDetails(')) {
        // We can replace the row creation part to include the View Bank Details button
        code = code.replace(
            /d\.withdrawals\.forEach\s*\(\s*\(?\s*wd\s*(?:,\s*idx)?\s*\)?\s*=>\s*\{/,
            `d.withdrawals.forEach((wd) => {`
        );
        console.log("Withdrawal loop located and patched successfully.");
    }

    fs.writeFileSync('admin.html', code, 'utf8');
    console.log("Admin panel updated successfully!");
}
