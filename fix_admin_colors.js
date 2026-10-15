const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    // Add Green, Violet, Red handling in admin control endpoint if needed
    let oldControl = `const { nextNum, nextBs } = req.body;`;
    let newControl = `const { nextNum, nextBs, nextCol } = req.body;
    if(nextCol === 'green') db.manualNextResult = [1,3,7,9][Math.floor(Math.random()*4)];
    if(nextCol === 'red') db.manualNextResult = [2,4,6,8][Math.floor(Math.random()*4)];
    if(nextCol === 'violet') db.manualNextResult = [0,5][Math.floor(Math.random()*2)];`;

    if(code.includes(oldControl) && !code.includes('nextCol')){
        code = code.replace(oldControl, newControl);
    }

    // Add Green, Violet, Red buttons inside Admin HTML UI
    let oldBsButtons = `<button class="btn" style="background:#2196f3;flex:1;" onclick="setBs('Small')">Small</button>`;
    let colorButtons = `<button class="btn" style="background:#2196f3;flex:1;" onclick="setBs('Small')">Small</button>
        </div>
        <div style="font-size:10px;margin:8px 0 4px 0;color:#8b949e;">Colors (Green / Violet / Red):</div>
        <div style="display:flex;gap:4px;">
            <button class="btn" style="background:#4caf50;flex:1;" onclick="setCol('green')">Green</button>
            <button class="btn" style="background:#9c27b0;flex:1;" onclick="setCol('violet')">Violet</button>
            <button class="btn" style="background:#f44336;flex:1;" onclick="setCol('red')">Red</button>`;

    let oldScriptFunc = `function setBs(bs){ fetch('/api/admin/control'`;
    let colorScriptFunc = `function setCol(c){ fetch('/api/admin/control', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({nextCol: c}) }).then(r=>r.json()).then(res=>{ alert('Set Color: ' + c); }); }
    function setBs(bs){ fetch('/api/admin/control'`;

    if(!code.includes('setCol')){
        code = code.replace(oldBsButtons, colorButtons);
        code = code.replace(oldScriptFunc, colorScriptFunc);
        fs.writeFileSync(serverPath, code);
        console.log("Admin Green/Violet/Red controls added successfully!");
    }
}
