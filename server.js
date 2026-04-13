const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();

const DB_PATH = './database.json';
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// LIVELLO 16: Creazione automatica cartelle per evitare errori di scrittura
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.static('public'));

// Configurazione Storage per Foto e CV
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper per leggere il DB
const getDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- API ROUTES ---

// Carica tutti gli utenti (usato dalle liste)
app.get('/api/utenti', (req, res) => {
    const db = getDB();
    res.json(db.utenti);
});

// LIVELLO 4 & 7: Carica singolo utente per ID (fondamentale per profilo-sommelier.html)
app.get('/api/utenti/:id', (req, res) => {
    const db = getDB();
    const utente = db.utenti.find(u => u.id === req.params.id);
    if (utente) res.json(utente);
    else res.status(404).send("Utente non trovato");
});

// Registrazione con controllo duplicati (Livello 10)
app.post('/api/register', upload.fields([{name:'foto'}, {name:'cv'}]), (req, res) => {
    const db = getDB();
    if (db.utenti.find(u => u.email === req.body.email)) {
        return res.status(400).json({ success: false, message: "Email già registrata" });
    }

    const nuovoUtente = {
        id: "ID-" + Math.random().toString(36).substr(2, 9),
        ...req.body,
        foto: req.files['foto'] ? '/uploads/' + req.files['foto'][0].filename : null,
        cv: req.files['cv'] ? '/uploads/' + req.files['cv'][0].filename : null
    };

    db.utenti.push(nuovoUtente);
    saveDB(db);
    res.json({ success: true, user: nuovoUtente });
});

// Invio Messaggi e File in Chat (Livello 17)
app.post('/api/chat/send', upload.single('allegato'), (req, res) => {
    const db = getDB();
    const nuovoMessaggio = {
        ...req.body,
        file: req.file ? '/uploads/' + req.file.filename : null,
        timestamp: new Date()
    };
    db.messaggi.push(nuovoMessaggio);
    saveDB(db);
    res.json({ success: true });
});

// LIVELLO 20: Cancellazione Account GDPR
app.delete('/api/utenti/:id', (req, res) => {
    let db = getDB();
    db.utenti = db.utenti.filter(u => u.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
});

app.listen(3000, () => console.log("🚀 EnoHub Enterprise V20 attivo su http://localhost:3000"));