const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const finalBankFixScript = `
<script>
// Direct DOM Interceptor for Search Full A-Z History
(function() {
  const origFetch = window.fetch;
  window.fetch = async function() {
    const response = await origFetch.apply(this, arguments);
    const url = arguments[0] || '';
    if (typeof url === 'string' && (url.includes('/api/admin/user-history') || url.includes('user-history') || url.includes('/api/admin/data'))) {
      const cloned = response.clone();
      cloned.json().then(data => {
        if (data) {
          window.__lastUserHistoryData = data;
        }
      }).catch(() => {});
    }
    return response;
  };

  setInterval(() => {
    const searchResBox = document.getElementById('user-history-result') || document.querySelector('.user-search-result') || document.body;
    if (!searchResBox) return;

    // Search for elements containing bank name and format them
    const pElements = searchResBox.querySelectorAll('div, p, span, li');
    pElements.forEach(el => {
      if (el.children.length === 0 && el.innerText.includes('Punjab National Bank') && !el.innerText.includes('A/C:')) {
        let bankStr = 'Punjab National Bank';
        if (window.__lastUserHistoryData) {
          const wList = window.__lastUserHistoryData.withdrawals || window.__lastUserHistoryData.userWithdrawals || [];
          if (wList.length > 0) {
            const w = wList[0];
            const name = w.holderName || w.name || w.accountHolder || (w.bank && w.bank.name) || '';
            const acc = w.accountNumber || w.account || (w.bank && w.bank.account) || '';
            const ifsc = w.ifsc || (w.bank && w.bank.ifsc) || '';
            
            let extra = [];
            if (name) extra.push('Holder: ' + name);
            if (acc) extra.push('A/C: ' + acc);
            if (ifsc) extra.push('IFSC: ' + ifsc);

            if (extra.length > 0) {
              bankStr += ' | ' + extra.join(' | ');
            }
          }
        }
        el.innerText = el.innerText.replace('Punjab National Bank', bankStr);
      }
    });
  }, 500);
})();
</script>
`;

if (!html.includes('Direct DOM Interceptor for Search Full A-Z History')) {
  html = html.replace('</body>', finalBankFixScript + '\n</body>');
  fs.writeFileSync('admin.html', html);
  console.log("Final Bank Interceptor Injected Successfully");
}
