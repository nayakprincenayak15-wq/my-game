const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('maan.win is live!'));
app.listen(process.env.PORT || 10000, () => console.log('Server running'));
