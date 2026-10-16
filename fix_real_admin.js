const fs = require('fs');

// Check admin.html in root folder
if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');
    
    // Inject Bank details display directly into the table headers & rows
    // Replace "Action" or table structure to show Bank Info
    html = html.replace(/<th>Action<\/th>/gi, '<th>Bank Details</th><th>Action</th>');
    
    // Update rendering of withdrawal rows to include bank details
    html = html.replace(/<td>\$\{w\.status\}<\/td>/gi, `<td>\${w.status}</td><td><b>Bank:</b> \${w.bank||'N/A'}<br><b>Acc:</b> \${w.acc||'N/A'}<br><b>IFSC:</b> \${w.ifsc||'N/A'}<br><b>Name:</b> \${w.holder||'N/A'}</td>`);
    
    fs.writeFileSync('admin.html', html, 'utf8');
    console.log("admin.html patched directly in root!");
} else {
    console.log("admin.html not found in root!");
}
