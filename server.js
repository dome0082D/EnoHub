const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = path.join(__dirname, 'database.json');

// Inizializza DB
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ utenti: [], messaggi: [] }));
}

app.get('/api/utenti', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(data.utenti);
});

app.post('/api/register', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_PATH));
    const nuovoUtente = { id: Date.now(), ...req.body };
    data.utenti.push(nuovoUtente);
    fs.writeFileSync(DB_PATH, JSON.stringify(data));
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`EnoHub attivo su porta ${PORT}`));
