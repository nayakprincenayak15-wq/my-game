const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html.replace(/<!-- Top Right Elements exact as photo -->[\s\S]*?<\/script>/gi, '');

    let finalUI = `
    <!-- Top Right Elements with Live Notice Marquee -->
    <div style="position: absolute; top: 48px; right: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; z-index: 999; max-width: 170px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Refer Icon -->
            <div onclick="openReferModal()" style="cursor: pointer; text-align: center; color: #fff; font-size: 9px; font-weight: bold;">
                <div style="font-size: 15px; margin-bottom: -2px;">🔗</div>
                <span>Refer</span>
            </div>

            <!-- Notice Board Icon -->
            <div onclick="showNoticePopup()" style="cursor: pointer; background: #ff9800; color: #000; padding: 3px 6px; border-radius: 5px; font-size: 9px; font-weight: bold; border: 1px solid #fff; display: flex; align-items: center; gap: 3px; box-shadow: 0 0 5px rgba(255,152,0,0.8);">
                📢 <span>NOTICE</span>
            </div>
        </div>

        <!-- Live Running Notice Ticker -->
        <div id="noticeTickerBox" style="background: rgba(0,0,0,0.6); border: 1px solid #ff9800; padding: 2px 6px; border-radius: 4px; width: 100%; overflow: hidden; white-space: nowrap;">
            <div id="noticeMarquee" style="font-size: 9px; color: #00e676; font-weight: bold; display: inline-block; animation: marquee 10s linear infinite;">
                Welcome to maan.win!
            </div>
        </div>
    </div>

    <style>
    @keyframes marquee {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
    }
    </style>

    <!-- Refer Modal -->
    <div id="referModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;justify-content:center;align-items:center;">
        <div style="background:#161b22;padding:18px;border-radius:12px;width:85%;max-width:300px;text-align:center;border:1px solid #30363d;">
            <h4 style="color:#58a6ff;margin:0 0 8px 0;font-size:14px;">👥 Refer & Earn (10% Bonus)</h4>
            <p style="font-size:10px;color:#c9d1d9;margin-bottom:10px;">Share link via WhatsApp, Telegram, Instagram & get 10% bonus!</p>
            <input type="text" id="refLinkInp" readonly style="width:100%;padding:6px;background:#0d1117;border:1px solid #30363d;color:#00e676;border-radius:6px;font-size:10px;text-align:center;margin-bottom:10px;box-sizing:border-box;">
            <button onclick="shareViaSocial()" style="background:#25D366;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;margin-bottom:6px;">🚀 Share on WhatsApp / Telegram</button>
            <button onclick="copyRefLink()" style="background:#238636;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;">📋 Copy Link</button>
            <button onclick="closeReferModal()" style="background:#da3633;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-size:10px;cursor:pointer;margin-top:8px;width:100%;">Close</button>
        </div>
    </div>

    <script>
    let currentNoticeMsg = "Welcome to maan.win!";

    function showNoticePopup(){
        alert("📢 ADMIN NOTICE BOARD:\n\n" + currentNoticeMsg);
    }

    function openReferModal(){
        let userPhone = localStorage.getItem('userPhone') || 'Guest';
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

    function shareViaSocial(){
        let link = document.getElementById('refLinkInp').value;
        let text = "Join maan.win color prediction game using my link and get bonuses: " + link;
        if (navigator.share) {
            navigator.share({ title: 'maan.win Refer', text: text, url: link }).catch(() => {});
        } else {
            window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
        }
    }

    setInterval(() => {
        let p = localStorage.getItem('userPhone') || '';
        fetch('/api/user-data?phone=' + p)
        .then(r => r.json())
        .then(d => {
            if(d.settings && d.settings.announcement){
                currentNoticeMsg = d.settings.announcement;
                let m = document.getElementById('noticeMarquee');
                if(m && m.innerText !== currentNoticeMsg) m.innerText = currentNoticeMsg;
            }
            if(d.settings && d.settings.telegram){
                let tgBtn = document.querySelector('a[href*="t.me"]');
                if(tgBtn) tgBtn.href = d.settings.telegram;
            }
        }).catch(e=>{});
    }, 3000);
    </script>
    `;

    html = html.replace('</body>', finalUI + '</body>');
    fs.writeFileSync(htmlPath, html);
    console.log("Frontend updated successfully!");
}
