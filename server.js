const express = require('express');
const app = express();
app.get('*', (req, res) => res.send('Project completely wiped. Ready for new game!'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log('Wiped server running on port ' + PORT));
