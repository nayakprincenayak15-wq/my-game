const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Remove earlier added big elements
    html = html.replace(/<!-- Live Notice Banner -->[\s\S]*?<\/script>/gi, '');

    let newTopElements = `
    <!-- Top Compact Notice & Refer Bar -->
    <div id="topNoticeBar" style="background:#161b22;border:1px solid #30363d;padding:6px 10px;margin:8px 0;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="font-size:11px;color:#f0883e;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">
            📢 <span id="noticeTxt">Welcome to maan.win!</span>
        </div>
        <button onclick="openReferModal()" style="background:#1f6feb;color:#fff;border:none;padding:4px 10px;border-radius:12px;font-size:10px;font-weight:bold;cursor:pointer;white-space:nowrap;">
            👥 Refer
        </button>
    </div>

    <!-- Refer Modal -->
    <div id="referModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;justify-content:center;align-items:center;">
        <div style="background:#161b22;padding:18px;border-radius:12px;width:85%;max-width:300px;text-align:center;border:1px solid #30363d;">
            <h4 style="color:#58a6ff;margin:0 0 8px 0;font-size:14px;">👥 Refer & Earn (10% Bonus)</h4>
            <p style="font-size:10px;color:#c9d1d9;margin-bottom:10px;">Share link with friends & get 10% bonus on their first deposit!</p>
            <input type="text" id="refLinkInp" readonly style="width:100%;padding:6px;background:#0d1117;border:1px solid #30363d;color:#00e676;border-radius:6px;font-size:10px;text-align:center;margin-bottom:10px;box-sizing:border-box;">
            <button onclick="copyRefLink()" style="background:#238636;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;">Copy Referral Link</button>
            <button onclick="closeReferModal()" style="background:#da3633;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-size:10px;cursor:pointer;margin-top:8px;width:100%;">Close</button>
        </div>
    </div>

    <script>
    function openReferModal(){
        let userPhone = localStorage.getItem('userPhone') || '';
        let link = window.location.origin + '/?ref=' + userPhone;
        document.getElementById('refLinkInp').value = link;
        document.getElementById('referModal').style.display = 'flex';
    }
    function closeReferModal(){ document.getElementById('referModal').style.display = 'none'; }
    function copyRefLink(){
        let inp = document.getElementById('refLinkInp');
        inp.select();
        document.execCommand('copy');
        alert('Referral link copied to clipboard!');
    }

    setInterval(() => {
        let p = localStorage.getItem('userPhone') || '';
        fetch('/api/user-data?phone=' + p)
        .then(r => r.json())
        .then(d => {
            if(d.settings && d.settings.announcement){
                document.getElementById('noticeTxt').innerText = d.settings.announcement;
            }
            if(d.settings && d.settings.telegram){
                let tgBtn = document.querySelector('a[href*="t.me"]');
                if(tgBtn) tgBtn.href = d.settings.telegram;
            }
        }).catch(e=>{});
    }, 3000);
    </script>
    `;

    html = html.replace('</body>', newTopElements + '</body>');
    fs.writeFileSync(htmlPath, html);
    console.log("UI layout fixed cleanly!");
}
