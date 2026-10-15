const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    let correctTgScript = `
    <script>
    setInterval(() => {
        fetch('/api/admin/data?t=' + Date.now())
        .then(r => r.json())
        .then(d => {
            if(d.settings && d.settings.telegram){
                let rawTg = d.settings.telegram.trim();
                let finalTgUrl = rawTg;
                if(!rawTg.startsWith('http')){
                    let cleanName = rawTg.replace('@', '');
                    finalTgUrl = 'https://t.me/' + cleanName;
                }
                let elements = document.querySelectorAll('button, a, div');
                elements.forEach(el => {
                    if(el.innerText && el.innerText.trim().toLowerCase() === 'telegram'){
                        el.onclick = function(e){
                            e.preventDefault();
                            window.open(finalTgUrl, '_blank');
                        };
                    }
                });
            }
        }).catch(e=>{});
    }, 2500);
    </script>
    `;

    if(!html.includes('finalTgUrl')){
        html = html.replace('</body>', correctTgScript + '</body>');
        fs.writeFileSync(htmlPath, html);
        console.log("Telegram URL cleaner added!");
    }
}
