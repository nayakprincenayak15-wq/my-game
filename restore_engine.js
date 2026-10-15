const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let serverCode = fs.readFileSync(serverPath, 'utf8');

    // Make sure timer and game loop sync script is added properly
    let syncScript = `
// Game Engine Sync Fix
if (!global.gameTimerStarted) {
    global.gameTimerStarted = true;
    setInterval(() => {
        let now = new Date();
        let seconds = 30 - (now.getSeconds() % 30);
        let periodStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            Math.floor((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 30).toString().padStart(5, '0');
        
        global.currentPeriod = periodStr;
        global.timerSeconds = seconds;
    }, 1000);
}
    `;

    if (!serverCode.includes('global.gameTimerStarted')) {
        serverCode += '\n' + syncScript;
        fs.writeFileSync(serverPath, serverCode);
        console.log("Game loop & timer restored in server.js");
    }
}
