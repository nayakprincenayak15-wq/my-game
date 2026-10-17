const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Patch to replace simple withdrawal display in A-Z search with full detailed bank view
const detailedBankPatch = `
<script>
// Detailed Bank Info Injector for A-Z History Withdrawals
window.addEventListener('DOMContentLoaded', () => {
  const originalFetch = window.fetch;
  // Hook into fetch or history rendering to expand bank info
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const withdrawalItems = document.querySelectorAll('#user-history-result div, .history-result div, div');
      withdrawalItems.forEach(el => {
        if (el.innerText && el.innerText.includes('Punjab National Bank') && !el.innerText.includes('A/C:')) {
          // If bank details exist in parent data or dataset, render them fully
          // We can append dummy/actual placeholders if available in the object
        }
      });
    });
  });
  const target = document.getElementById('user-history-result') || document.body;
  if(target) observer.observe(target, { childList: true, subtree: true });
});
</script>
`;

// Let's directly patch the HTML template script where searchUserHistory formats the withdrawal string
html = html.replace(/w\.bankName|w\.bank|Punjab National Bank/g, match => {
  return match + ' + (w.holderName ? " | Name: " + w.holderName : "") + (w.accountNumber ? " | A/C: " + w.accountNumber : "") + (w.ifsc ? " | IFSC: " + w.ifsc : "")';
});

if (!html.includes('Detailed Bank Info Injector')) {
  html = html.replace('</body>', detailedBankPatch + '\n</body>');
}

fs.writeFileSync('admin.html', html);
console.log("Detailed bank mapping applied.");
