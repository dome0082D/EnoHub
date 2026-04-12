const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Configurazione Upload File (salva in /uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve i file HTML/CSS/JS
app.use('/uploads', express.static('uploads')); // Rende accessibili i file caricati

// Inizializza il database JSON se non esiste
const dbFile = 'database.json';
if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ users: [], messages: [] }));
}

function getDB() { return JSON.parse(fs.readFileSync(dbFile)); }
function saveDB(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }

// API: Registrazione
app.post('/api/register', (req, res) => {
    const db = getDB();
    const newUser = { id: Date.now().toString(), ...req.body };
    
    if (db.users.find(u => u.email === newUser.email)) {
        return res.status(400).json({ error: "Email già in uso." });
    }
    
    db.users.push(newUser);
    saveDB(db);
    res.json(newUser);
});

// API: Login
app.post('/api/login', (req, res) => {
    const db = getDB();
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) res.json(user);
    else res.status(401).json({ error: "Credenziali errate." });
});

// API: Lista Utenti (Per i due riquadri)
app.get('/api/users', (req, res) => {
    const db = getDB();
    // Non inviare le password al frontend!
    const safeUsers = db.users.map(({password, ...u}) => u);
    res.json(safeUsers);
});

// API: Upload File (Profilo o Chat)
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato." });
    res.json({ fileUrl: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

// API: Invia Messaggio
app.post('/api/messages', (req, res) => {
    const db = getDB();
    const msg = { id: Date.now(), timestamp: new Date(), ...req.body };
    db.messages.push(msg);
    saveDB(db);
    res.json(msg);
});

// API: Leggi Messaggi (Tra due utenti)
app.get('/api/messages/:user1/:user2', (req, res) => {
    const db = getDB();
    const { user1, user2 } = req.params;
    const chat = db.messages.filter(m => 
        (m.sender === user1 && m.receiver === user2) || 
        (m.sender === user2 && m.receiver === user1)
    );
    res.json(chat);
});

app.listen(PORT, () => console.log(`EnoHub Server in esecuzione su http://localhost:${PORT}`));