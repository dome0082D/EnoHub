/* ============================================================
   ENOHUB ENTERPRISE - SERVER CORE DEFINITIVO (V. 2026)
   ============================================================ */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'vinum_elite_super_secret_key_2026';

// --- CONFIGURAZIONE PERCORSI DATABASE ---
const USERS_FILE = path.join(__dirname, 'database/users.json');
const CHATS_FILE = path.join(__dirname, 'database/chats.json');
const EVENTS_FILE = path.join(__dirname, 'database/events.json');

// Memoria temporanea per la chat di gruppo (si svuota al riavvio del server)
let groupMessages = []; 

// --- CONFIGURAZIONE MULTER (CARICAMENTO FILE) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads/chat_files/';
        if (file.fieldname === 'foto') folder = 'uploads/profiles/';
        if (file.fieldname === 'cv') folder = 'uploads/cv/';
        cb(null, path.join(__dirname, folder));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- FUNZIONI UTILITY JSON ---
const readJson = (file) => {
    try {
        if (!fs.existsSync(file)) return [];
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) { return []; }
};

const writeJson = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// --- MIDDLEWARE DI AUTENTICAZIONE ---
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Effettua il login per interagire.' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch (e) {
        res.status(403).json({ error: 'Sessione scaduta o non valida.' });
    }
};

// ======================== ROTTE API ========================

// 1. WIKIPEDIA (Archivio Mondiale Vini)
app.get('/api/wine-wiki/:wine', async (req, res) => {
    try {
        const query = req.params.wine;
        const response = await axios.get(`https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        res.json({
            nome: response.data.title,
            descrizione: response.data.extract,
            immagine: response.data.thumbnail ? response.data.thumbnail.source : null,
            link: response.data.content_urls.desktop.page
        });
    } catch (e) {
        res.status(404).json({ error: "Vino non trovato nell'archivio mondiale Wikipedia." });
    }
});

// 2. REGISTRAZIONE (Controllo email unica + Upload)
app.post('/api/register', upload.fields([{name:'foto'}, {name:'cv'}]), async (req, res) => {
    const users = readJson(USERS_FILE);
    if (users.find(u => u.email === req.body.email)) {
        return res.status(400).json({ error: "Esiste già un profilo con questa email." });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = {
        ...req.body,
        id: Date.now().toString(),
        password: hashedPassword,
        foto: req.files['foto'] ? `uploads/profiles/${req.files['foto'][0].filename}` : null,
        cv: req.files['cv'] ? `uploads/cv/${req.files['cv'][0].filename}` : null,
        sponsored_cantine: []
    };

    users.push(newUser);
    writeJson(USERS_FILE, users);
    res.json({ success: true });
});

// 3. LOGIN
app.post('/api/login', async (req, res) => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.email === req.body.email);
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ error: "Email o password errati." });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '2h' });
    const { password, ...userSafe } = user;
    res.json({ success: true, token, user: userSafe });
});

// 4. GESTIONE UTENTI (Lista e Profilo Singolo)
app.get('/api/utenti', (req, res) => {
    let users = readJson(USERS_FILE);
    if (req.query.tipo) users = users.filter(u => u.tipo === req.query.tipo);
    res.json(users.map(({password, ...u}) => u));
});

app.get('/api/utenti/:id', (req, res) => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Profilo non trovato." });
    const { password, ...userSafe } = user;
    res.json(userSafe);
});

// 5. MODIFICA & CANCELLAZIONE (GDPR)
app.put('/api/utenti/update', authenticate, (req, res) => {
    const users = readJson(USERS_FILE);
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: "Utente non trovato." });
    
    users[idx] = { ...users[idx], ...req.body };
    writeJson(USERS_FILE, users);
    res.json({ success: true, user: users[idx] });
});

app.delete('/api/utenti/:id', authenticate, (req, res) => {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: "Azione non permessa." });
    let users = readJson(USERS_FILE);
    users = users.filter(u => u.id !== req.params.id);
    writeJson(USERS_FILE, users);
    res.json({ success: true, message: "Profilo eliminato definitivamente." });
});

// 6. GESTIONE EVENTI (La Tavola/Ravila)
app.get('/api/eventi', (req, res) => {
    res.json(readJson(EVENTS_FILE));
});

app.post('/api/eventi/create', authenticate, (req, res) => {
    const events = readJson(EVENTS_FILE);
    const newEvent = { id: Date.now().toString(), creatoreId: req.user.id, ...req.body };
    events.push(newEvent);
    writeJson(EVENTS_FILE, events);
    res.json({ success: true });
});

// 7. CHAT DI GRUPPO (Aperta anche agli ospiti)
app.get('/api/chat/gruppo', (req, res) => {
    res.json(groupMessages.slice(-50));
});

app.post('/api/chat/gruppo/send', (req, res) => {
    const { nome, testo } = req.body;
    groupMessages.push({ nome, testo, data: new Date() });
    res.json({ success: true });
});

// 8. CHAT PRIVATA & FILE SHARING (Solo Loggati)
app.post('/api/chat/send', authenticate, upload.single('allegato'), (req, res) => {
    const chats = readJson(CHATS_FILE);
    const newMsg = {
        id: Date.now().toString(),
        mittente: req.user.id,
        destinatario: req.body.destinatario,
        testo: req.body.testo,
        file: req.file ? `uploads/chat_files/${req.file.filename}` : null,
        data: new Date()
    };
    chats.push(newMsg);
    writeJson(CHATS_FILE, chats);
    res.json({ success: true });
});
// Rotta per recuperare la cronologia dei messaggi tra due utenti
app.get('/api/chat/history', authenticate, (req, res) => {
    const { me, to } = req.query;
    const chats = readJson(CHATS_FILE);
    
    // Filtra i messaggi dove io sono il mittente e lui il destinatario O viceversa
    const history = chats.filter(m => 
        (m.mittente === me && m.destinatario === to) || 
        (m.mittente === to && m.destinatario === me)
    );
    
    res.json(history);
});
// 10. SPONSORIZZAZIONI (Per collegare Sommelier e Cantine)
app.post('/api/sponsorizza', authenticate, (req, res) => {
    const { sommelierId, cantinaId } = req.body;
    const users = readJson(USERS_FILE);
    const sommelier = users.find(u => u.id === sommelierId);
    if (sommelier) {
        if (!sommelier.sponsored_cantine) sommelier.sponsored_cantine = [];
        if (!sommelier.sponsored_cantine.includes(cantinaId)) {
            sommelier.sponsored_cantine.push(cantinaId);
            writeJson(USERS_FILE, users);
        }
    }
    res.json({ success: true });
});
// ======================== AVVIO SERVER ========================

app.listen(PORT, () => {
    console.log(`
    🚀 ENOHUB ENTERPRISE LIVE
    --------------------------
    Porta: ${PORT}
    Livelli: 40 Attivi
    Database: JSON Locale
    Status: Pronto per Render
    `);

    // Check cartelle iniziali
    const folders = ['database', 'uploads/profiles', 'uploads/cv', 'uploads/chat_files'];
    folders.forEach(f => {
        if (!fs.existsSync(path.join(__dirname, f))) {
            fs.mkdirSync(path.join(__dirname, f), { recursive: true });
        }
    });

    // Init file JSON se non esistono
    if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
    if (!fs.existsSync(CHATS_FILE)) writeJson(CHATS_FILE, []);
    if (!fs.existsSync(EVENTS_FILE)) writeJson(EVENTS_FILE, []);
});
