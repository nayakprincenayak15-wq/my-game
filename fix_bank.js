const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Patch to ensure withdrawal bank details are properly rendered
const bankPatchScript = `
<script>
// Auto-patch to render bank details in withdrawals
const originalRenderWithdrawals = window.renderWithdrawals || function(withdrawals) {
  const container = document.getElementById('withdrawal-list') || document.querySelector('.withdrawals-container');
  if (!container) return;
  container.innerHTML = withdrawals.map(w => \`
    <div class="withdrawal-item">
      <span>Phone: \${w.phone}</span>
      <span>Amt: ₹\${w.amount}</span>
      <span>Status: \${w.status}</span>
      <div class="bank-info">
        Account: \${w.account || w.accountNumber || (w.bank && w.bank.account) || 'N/A'} | 
        IFSC: \${w.ifsc || (w.bank && w.bank.ifsc) || 'N/A'}
      </div>
    </div>
  \`).join('');
};
</script>
`;

if (!html.includes('Auto-patch to render bank details')) {
  html = html.replace('</body>', bankPatchScript + '\n</body>');
  fs.writeFileSync('admin.html', html);
  console.log("Bank Details Patch Injected");
}
