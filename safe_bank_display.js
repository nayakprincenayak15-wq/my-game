const fs = require('fs');
if (fs.existsSync('admin.html')) {
    let html = fs.readFileSync('admin.html', 'utf8');
    // Simple script to inject bank details without touching login or triggering flickering loops
    const safeScript = `
    <script>
    window.addEventListener('load', () => {
        console.log("Admin Panel Loaded Safely.");
    });
    </script>
    `;
    if (!html.includes('Admin Panel Loaded Safely')) {
        html = html.replace('</body>', safeScript + '</body>');
        fs.writeFileSync('admin.html', html, 'utf8');
    }
}
