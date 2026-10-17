const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Fast live update script
const fastScript = `
<script>
// Live Timer Fast Sync
if (typeof window.fastInterval !== 'undefined') clearInterval(window.fastInterval);
window.fastInterval = setInterval(() => {
  if (typeof loadAdminData === 'function') {
    loadAdminData();
  } else if (typeof fetchAdminData === 'function') {
    fetchAdminData();
  }
}, 1000);
</script>
`;

if (!html.includes('Live Timer Fast Sync')) {
  html = html.replace('</body>', fastScript + '\n</body>');
  fs.writeFileSync('admin.html', html);
  console.log("Fast Sync Injected Successfully");
} else {
  console.log("Already Injected");
}
