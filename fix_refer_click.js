const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Remove old refer modal elements/scripts to avoid duplication conflict
    html = html.replace(/<div id="referModal"[\s\S]*?<\/script>/gi, '');

    let directReferScript = `
    <!-- Refer Modal Popup -->
    <div id="referModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;justify-content:center;align-items:center;">
        <div style="background:#161b22;padding:20px;border-radius:12px;width:88%;max-width:320px;text-align:center;border:1px solid #30363d;">
            <h4 style="color:#58a6ff;margin:0 0 8px 0;font-size:15px;">👥 Refer & Earn (10% Bonus)</h4>
            <p style="font-size:11px;color:#c9d1d9;margin-bottom:12px;">Share your link on WhatsApp, Telegram or copy it. Get 10% bonus on your friend's first deposit!</p>
            
            <input type="text" id="refLinkInp" readonly style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;color:#00e676;border-radius:6px;font-size:11px;text-align:center;margin-bottom:10px;box-sizing:border-box;">
            
            <button onclick="shareWhatsApp()" style="background:#25D366;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;margin-bottom:6px;">💬 Share on WhatsApp</button>
            <button onclick="shareTelegram()" style="background:#0088cc;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;margin-bottom:6px;">✈️ Share on Telegram</button>
            <button onclick="copyRefLink()" style="background:#238636;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;width:100%;margin-bottom:10px;">📋 Copy Link</button>
            
            <button onclick="closeReferModal()" style="background:#da3633;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;width:100%;">Close</button>
        </div>
    </div>

    <script>
    function openReferModal(){
        let userPhone = localStorage.getItem('userPhone') || 'Guest';
        let link = window.location.origin + '/?ref=' + userPhone;
        let inp = document.getElementById('refLinkInp');
        if(inp) inp.value = link;
        let modal = document.getElementById('referModal');
        if(modal) modal.style.display = 'flex';
    }

    function closeReferModal(){
        let modal = document.getElementById('referModal');
        if(modal) modal.style.display = 'none';
    }

    function copyRefLink(){
        let inp = document.getElementById('refLinkInp');
        if(inp){
            inp.select();
            inp.setSelectionRange(0, 99999);
            document.execCommand('copy');
            alert('Referral link copied to clipboard!');
        }
    }

    function shareWhatsApp(){
        let link = document.getElementById('refLinkInp').value;
        let text = "Play maan.win color prediction game and earn daily! Join using my referral link: " + link;
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
    }

    function shareTelegram(){
        let link = document.getElementById('refLinkInp').value;
        let text = "Play maan.win color prediction game and earn daily! Join using my referral link: " + link;
        window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text), '_blank');
    }
    </script>
    `;

    html = html.replace('</body>', directReferScript + '</body>');
    fs.writeFileSync(htmlPath, html);
    console.log("Refer click and share fixed successfully!");
}
