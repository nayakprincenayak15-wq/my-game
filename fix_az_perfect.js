const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Injection script to force A-Z search rendering to parse bank objects completely
const bankFixCode = `
<script>
(function() {
  // Override search function formatting
  const origSearch = window.searchUserHistory || window.searchUser;
  
  function formatWithdrawalLine(w) {
    if (!w) return '';
    let bankName = w.bankName || w.bank || 'Bank';
    let holder = w.holderName || w.name || w.accountHolder || (w.bank && w.bank.name) || '';
    let acc = w.accountNumber || w.account || (w.bank && w.bank.account) || '';
    let ifsc = w.ifsc || (w.bank && w.bank.ifsc) || '';
    
    let details = [bankName];
    if (holder) details.push('Name: ' + holder);
    if (acc) details.push('A/C: ' + acc);
    if (ifsc) details.push('IFSC: ' + ifsc);
    
    return details.join(' | ');
  }

  // Intercept innerHTML updates on search history box
  setInterval(() => {
    const box = document.getElementById('user-history-result') || document.querySelector('.user-search-result');
    if (!box) return;

    if (window.__lastUserHistoryData && window.__lastUserHistoryData.withdrawals) {
      const wList = window.__lastUserHistoryData.withdrawals;
      let htmlContent = box.innerHTML;
      
      wList.forEach(w => {
        const fullBankText = formatWithdrawalLine(w);
        if (fullBankText && htmlContent.includes('Punjab National Bank') && !htmlContent.includes('A/C:')) {
          box.innerHTML = box.innerHTML.replace(/Punjab National Bank/g, fullBankText);
        }
      });
    }
  }, 400);
})();
</script>
`;

if (!html.includes('Override search function formatting')) {
  html = html.replace('</body>', bankFixCode + '\n</body>');
  fs.writeFileSync('admin.html', html);
  console.log("A-Z History Bank Renderer Patch Injected");
}
