const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Per caricare file e foto
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Configurazione Caricamento File (Livello 16)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const DB_PATH = './database.json';

// Funzione Repository (Livello 15)
const getDB = () => JSON.parse(fs.readFileSync(DB_PATH));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// API REGISTRAZIONE (Livello 9-10)
app.post('/api/register', upload.fields([{name: 'foto'}, {name: 'cv'}]), (req, res) => {
    const db = getDB();
    const info = req.body;

    if (db.utenti.find(u => u.email === info.email)) {
        return res.status(400).json({ success: false, message: "Email già registrata." });
    }

    const nuovoUtente = {
        id: "ID" + Date.now(),
        ...info,
        foto: req.files['foto'] ? '/uploads/' + req.files['foto'][0].filename : null,
        cv: req.files['cv'] ? '/uploads/' + req.files['cv'][0].filename : null,
        data: new Date().toISOString()
    };

    db.utenti.push(nuovoUtente);
    saveDB(db);
    res.json({ success: true, user: nuovoUtente });
});

// API CHAT (Livello 17)
app.post('/api/chat/send', upload.single('allegato'), (req, res) => {
    const db = getDB();
    const messaggio = {
        mittente: req.body.mittente,
        destinatario: req.body.destinatario,
        testo: req.body.testo,
        file: req.file ? '/uploads/' + req.file.filename : null,
        data: new Date()
    };
    db.messaggi.push(messaggio);
    saveDB(db);
    res.json({ success: true });
});

app.listen(3000, () => console.log("EnoHub Enterprise v20 Online"));
