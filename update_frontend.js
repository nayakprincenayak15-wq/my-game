const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    let noticeAndReferHTML = `
    <!-- Live Notice Banner -->
    <div id="noticeBanner" style="background:#f0883e;color:#000;padding:8px;text-align:center;font-weight:bold;font-size:12px;margin-bottom:10px;border-radius:6px;display:none;">
        📢 <span id="noticeTxt">Welcome to maan.win!</span>
    </div>

    <!-- Refer & Earn Button -->
    <div style="text-align:center;margin:10px 0;">
        <button onclick="openReferModal()" style="background:#1f6feb;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:bold;cursor:pointer;">
            👥 Refer & Earn (10% Bonus)
        </button>
    </div>

    <!-- Refer Modal -->
    <div id="referModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;justify-content:center;align-items:center;">
        <div style="background:#161b22;padding:20px;border-radius:12px;width:85%;max-width:320px;text-align:center;border:1px solid #30363d;">
            <h4 style="color:#58a6ff;margin-top:0;">👥 Refer & Earn</h4>
            <p style="font-size:11px;color:#c9d1d9;">Share link with friends & get 10% bonus on their first deposit!</p>
            <input type="text" id="refLinkInp" readonly style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;color:#00e676;border-radius:6px;font-size:10px;text-align:center;margin:10px 0;box-sizing:border-box;">
            <button onclick="copyRefLink()" style="background:#238636;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;">Copy Referral Link</button>
            <button onclick="closeReferModal()" style="background:#da3633;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:10px;cursor:pointer;margin-top:10px;width:100%;">Close</button>
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
                document.getElementById('noticeBanner').style.display = 'block';
            }
        }).catch(e=>{});
    }, 3000);
    </script>
    `;

    if(!html.includes('referModal')){
        html = html.replace('</body>', noticeAndReferHTML + '</body>');
        fs.writeFileSync(htmlPath, html);
        console.log("Frontend successfully updated!");
    } else {
        console.log("Frontend already has refer and notice system!");
    }
}
