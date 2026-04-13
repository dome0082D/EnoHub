const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();

const DB_PATH = path.join(__dirname, 'database.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Crea cartella uploads se non esiste (Evita errori di caricamento)
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.static('public')); // Serve tutti i file nella cartella public

// Configurazione Multer per Foto e CV
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper Funzioni Database
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- ROTTE API ---

// 1. Prendi tutti gli utenti
app.get('/api/utenti', (req, res) => {
    res.json(readDB().utenti);
});

// 2. Prendi singolo utente per ID (Risolve errore nelle pagine Profilo)
app.get('/api/utenti/:id', (req, res) => {
    const db = readDB();
    const utente = db.utenti.find(u => u.id === req.params.id);
    utente ? res.json(utente) : res.status(404).json({error: "Non trovato"});
});

// 3. Registrazione (Gestisce Foto, CV e Duplicati Email)
app.post('/api/register', upload.fields([{name:'foto'}, {name:'cv'}]), (req, res) => {
    const db = readDB();
    if (db.utenti.find(u => u.email === req.body.email)) {
        return res.status(400).json({ success: false, message: "Email già registrata!" });
    }

    const nuovoUtente = {
        id: "ID-" + Date.now(),
        ...req.body,
        foto: req.files['foto'] ? '/uploads/' + req.files['foto'][0].filename : null,
        cv: req.files['cv'] ? '/uploads/' + req.files['cv'][0].filename : null
    };

    db.utenti.push(nuovoUtente);
    writeDB(db);
    res.json({ success: true, user: nuovoUtente });
});

// 4. Chat: Invia Messaggi e Allegati
app.post('/api/chat/send', upload.single('allegato'), (req, res) => {
    const db = readDB();
    const msg = { ...req.body, file: req.file ? '/uploads/' + req.file.filename : null, date: new Date() };
    db.messaggi.push(msg);
    writeDB(db);
    res.json({ success: true });
});

// 5. Livello 20: Cancellazione Account (GDPR)
app.delete('/api/utenti/:id', (req, res) => {
    let db = readDB();
    db.utenti = db.utenti.filter(u => u.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log("✅ EnoHub Enterprise Online!");
    console.log("👉 Vai su: http://localhost:3000");
});
