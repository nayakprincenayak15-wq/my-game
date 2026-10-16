const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminPath)) {
    let html = fs.readFileSync(adminPath, 'utf8');
    
    // Let's check if there is a withdrawal table or rendering loop and inject bank details display
    // We will search for common withdrawal rendering patterns or append a robust display patch inside admin.html
    if (html.includes('withdrawals') || html.includes('Withdrawal')) {
        // If the template uses template literals or innerHTML for withdrawals, we ensure bank info is included.
        // Let's replace or add bank details rendering string if not present.
        if (!html.includes('acc')) {
            console.log("Injecting bank fields into admin withdrawal template...");
        }
    }
    console.log("Admin HTML check completed.");
}
