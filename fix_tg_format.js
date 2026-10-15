const fs = require('fs');
const path = require('path');

let htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');

    let tgScript = `
    <script>
    setInterval(() => {
        fetch('/api/admin/data?t=' + Date.now())
        .then(r => r.json())
        .then(d => {
            if(d.settings && d.settings.telegram){
                let raw = d.settings.telegram.trim();
                let cleanUrl = raw.startsWith('http') ? raw : 'https://t.me/' + raw.replace('@', '');
                let elements = document.querySelectorAll('button, a, div');
                elements.forEach(el => {
                    if(el.innerText && el.innerText.trim().toLowerCase() === 'telegram'){
                        el.onclick = function(e){
                            e.preventDefault();
                            window.open(cleanUrl, '_blank');
                        };
                    }
                });
            }
        }).catch(e=>{});
    }, 2000);
    </script>
    `;

    if(!html.includes('cleanUrl')){
        html = html.replace('</body>', tgScript + '</body>');
        fs.writeFileSync(htmlPath, html);
        console.log("Telegram format fix applied!");
    }
}
