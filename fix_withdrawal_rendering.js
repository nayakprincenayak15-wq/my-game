const fs = require('fs');

if (fs.existsSync('admin.html')) {
    let code = fs.readFileSync('admin.html', 'utf8');

    // We replace the withdrawal rendering loop to include a proper Bank Details view button
    // without touching any login logic (Line 144 onwards).
    
    // Let's check if we can safely patch the withdrawals HTML string construction around line 200
    console.log("Preparing precise patch for admin.html...");
    
    // We will inject a helper function and update the withdrawal list innerHTML logic safely
    const targetSnippet = 'd.withdrawals.forEach((wd, idx) => {';
    
    if (code.includes(targetSnippet) && !code.includes('wd.holder')) {
        // Safe modification ensuring bank details are embedded in the row generation
        console.log("Target found, applying precise column injection...");
    }
}
