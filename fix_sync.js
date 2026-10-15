const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Update sync script to properly target Telegram button and notice ticker
    let syncScript = `
    <script>
    let currentNoticeMsg = "Welcome to maan.win!";

    function showNoticePopup(){
        alert("📢 ADMIN NOTICE BOARD:\\n\\n" + currentNoticeMsg);
    }

    setInterval(() => {
        let p = localStorage.getItem('userPhone') || '';
        fetch('/api/user-data?phone=' + p)
        .then(r => r.json())
        .then(d => {
            if(d.settings){
                if(d.settings.announcement){
                    currentNoticeMsg = d.settings.announcement;
                    let m = document.getElementById('noticeMarquee');
                    if(m && m.innerText !== currentNoticeMsg) m.innerText = currentNoticeMsg;
                }
                if(d.settings.telegram){
                    // Target Telegram button by text or href
                    let buttons = document.querySelectorAll('a, button');
                    buttons.forEach(btn => {
                        if(btn.innerText.toLowerCase().includes('telegram') || (btn.href && btn.href.includes('t.me'))){
                            btn.onclick = function(e){
                                e.preventDefault();
                                window.open(d.settings.telegram, '_blank');
                            };
                            if(btn.tagName === 'A') btn.href = d.settings.telegram;
                        }
                    });
                }
            }
        }).catch(e=>{});
    }, 2500);
    </script>
    `;

    if(!html.includes('currentNoticeMsg')){
        html = html.replace('</body>', syncScript + '</body>');
        fs.writeFileSync(htmlPath, html);
        console.log("Frontend sync script updated!");
    }
}
