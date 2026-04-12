const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Infrastruttura
const DB_PATH = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'public/uploads');

if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ utenti: [], messaggi: [] }));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json());
app.use(express.static('public'));

// --- LOGICA CORE (15 LIVELLI) ---

// API Registrazione con controllo Email Duplicate
app.post('/api/register', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        const userData = req.body;

        // Livello 10: Validation (Controllo Email)
        const exists = db.utenti.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
        if (exists) return res.status(400).json({ success: false, message: "Email già registrata." });

        // Livello 11: Business Logic
        const nuovoProfilo = {
            id: Date.now(),
            ...userData,
            dataIscrizione: new Date().toLocaleDateString(),
            verificato: true
        };

        db.utenti.push(nuovoProfilo);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        
        res.json({ success: true, message: "Benvenuto in EnoHub!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Errore del server." });
    }
});

// API Caricamento Utenti (Vetrina B2B)
app.get('/api/utenti', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    // Livello 12: DTO (Rimuoviamo le password per sicurezza)
    const profiliPubblici = db.utenti.map(({pass, ...u}) => u);
    res.json(profiliPubblici);
});

app.listen(PORT, () => console.log(`EnoHub Enterprise attivo su porta ${PORT}`));