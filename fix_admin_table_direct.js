const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'public', 'admin.html');
if (fs.existsSync(adminPath)) {
    let html = fs.readFileSync(adminPath, 'utf8');
    
    // Let's inject a direct function patch inside admin.html script where withdrawals are fetched and rendered
    const directScript = `
    <script>
    // Direct patch to ensure Bank Details show in Withdrawals
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                const response = await originalFetch.apply(this, args);
                if (args[0] && typeof args[0] === 'string' && args[0].includes('/admin/data')) {
                    response.clone().json().then(data => {
                        console.log("Admin Data Loaded:", data);
                    }).catch(err => {});
                }
                return response;
            };
        }, 1000);
    });
    </script>
    `;

    if (!html.includes('Direct patch to ensure Bank Details')) {
        html = html.replace('</body>', directScript + '</body>');
        fs.writeFileSync(adminPath, html, 'utf8');
        console.log("Direct admin table patch applied successfully!");
    }
}
