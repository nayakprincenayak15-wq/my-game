const fs = require('fs');
const path = require('path');

let serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let code = fs.readFileSync(serverPath, 'utf8');

    // Add 24/7 virtual bots simulation interval if not present
    if (!code.includes('virtualBotsActive')) {
        let botCode = `
// 24/7 Virtual Bots & Keep-Alive System to prevent server sleep and data reset
const botPhones = ['9876543210', '9876543211', '9876543212', '9876543213', '9876543214', '9876543215', '9876543216', '9876543217', '9876543218', '9876543219'];
botPhones.forEach(bp => {
    if (!db.users[bp]) {
        db.users[bp] = { phone: bp, password: 'bot', gameId: 'BOT' + Math.floor(1000+Math.random()*9000), balance: 50000, isBlocked: false };
    }
});

setInterval(() => {
    let randomBot = botPhones[Math.floor(Math.random() * botPhones.length)];
    let choices = ['0','1','2','3','4','5','6','7','8','9','Big','Small','red','green','violet'];
    let sel = choices[Math.floor(Math.random() * choices.length)];
    let amt = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
    
    db.bets.unshift({
        id: Date.now() + Math.random(),
        phone: randomBot,
        select: sel,
        amount: amt,
        quantity: 1,
        totalAmount: amt,
        period: db.currentPeriod,
        status: 'Pending'
    });
    if(db.bets.length > 100) db.bets.pop();
    saveData();
}, 5000);
        `;
        code = code.replace('const PORT = process.env.PORT || 10000;', botCode + '\nconst PORT = process.env.PORT || 10000;');
        fs.writeFileSync(serverPath, code);
        console.log("24/7 Bot simulation added successfully!");
    }
}
