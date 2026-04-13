/* ============================================================
   ENOHUB PROJECT - BACKEND SERVER (COMPLETO E DEFINITIVO)
   ============================================================ */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
// La porta dinamica per Render
const PORT = process.env.PORT || 3000; 
const SECRET_KEY = 'a51c30a51c30a51c30';

// Percorsi del database
const USERS_FILE = path.join(__dirname, 'database/users.json');
const CHATS_FILE = path.join(__dirname, 'database/chats.json');
const EVENTS_FILE = path.join(__dirname, 'database/events.json');

// Gestione dei file caricati (Foto, CV, Allegati Chat)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'foto') cb(null, path.join(__dirname, 'uploads/profiles/'));
    else if (file.fieldname === 'cv') cb(null, path.join(__dirname, 'uploads/cv/'));
    else cb(null, path.join(__dirname, 'uploads/chat_files/'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Funzioni per leggere e scrivere i JSON
const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } 
  catch (e) { return []; }
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Controllo Sicurezza (Login richiesto)
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Effettua il login.' });
  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (e) { res.status(403).json({ error: 'Sessione scaduta.' }); }
};

// ================= API ROUTES =================

// 1. Registrazione e Login
app.post('/api/register', upload.fields([{name:'foto'}, {name:'cv'}]), async (req, res) => {
    const { tipo, email, password, nome, cognome, citta, qualifica, specializzazione, bio } = req.body;
    const users = readJson(USERS_FILE);
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, error: "Email già in uso." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        tipo, email, nome, cognome, citta, qualifica, specializzazione, bio,
        password: hashedPassword,
        foto: req.files['foto'] ? `uploads/profiles/${req.files['foto'][0].filename}` : null,
        cv: req.files['cv'] ? `uploads/cv/${req.files['cv'][0].filename}` : null
    };
    
    users.push(newUser);
    writeJson(USERS_FILE, users);
    res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, error: "Email o password errati." });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    const { password: pw, ...userNoPw } = user;
    res.json({ success: true, token, user: userNoPw });
});

// 2. Lettura Utenti (Cantine e Sommelier)
app.get('/api/utenti', (req, res) => {
    let users = readJson(USERS_FILE);
    if (req.query.tipo) users = users.filter(u => u.tipo === req.query.tipo);
    res.json(users.map(({password, ...u}) => u));
});

app.get('/api/utenti/:id', (req, res) => {
    const user = readJson(USERS_FILE).find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Non trovato" });
    const { password, ...u } = user;
    res.json(u);
});

// 3. Gestione Eventi
app.get('/api/eventi', (req, res) => res.json(readJson(EVENTS_FILE)));

app.post('/api/eventi/create', authenticate, (req, res) => {
    const events = readJson(EVENTS_FILE);
    events.push({ id: Date.now().toString(), creatore: req.user.id, ...req.body });
    writeJson(EVENTS_FILE, events);
    res.json({ success: true });
});

// 4. CHAT PRIVATA (Quella che avevo dimenticato!)
app.get('/api/chat/:conversationId', authenticate, (req, res) => {
    const chats = readJson(CHATS_FILE);
    const messages = chats.filter(c => c.conversationId === req.params.conversationId);
    res.json(messages);
});

app.post('/api/chat/send', authenticate, upload.single('allegato'), (req, res) => {
    const { conversationId, testo } = req.body;
    const chats = readJson(CHATS_FILE);
    
    chats.push({
        id: Date.now().toString(),
        conversationId,
        mittente: req.user.id,
        testo,
        file: req.file ? `uploads/chat_files/${req.file.filename}` : null, 
        orario: new Date()
    });
    writeJson(CHATS_FILE, chats);
    res.json({ success: true });
});

// 5. CANCELLAZIONE PROFILO (Livello 20 GDPR - Quella che avevo dimenticato!)
app.delete('/api/utenti/:id', authenticate, (req, res) => {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: "Non autorizzato." });

    const users = readJson(USERS_FILE);
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Utente non trovato." });

    try {
        if (user.foto) fs.unlinkSync(path.join(__dirname, user.foto));
        if (user.cv) fs.unlinkSync(path.join(__dirname, user.cv));
    } catch (err) { console.error('File già rimossi'); }

    const updatedUsers = users.filter(u => u.id !== req.params.id);
    writeJson(USERS_FILE, updatedUsers);
    res.json({ success: true, message: "Account cancellato a norma GDPR." });
});

// Reindirizzamento SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ================= AVVIO E CHECK CARTELLE =================
app.listen(PORT, () => {
    console.log(`🚀 EnoHub live su porta ${PORT}`);
    
    // Lo scudo di Render: se mancano file o cartelle, li crea lui!
    if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
    if (!fs.existsSync(CHATS_FILE)) writeJson(CHATS_FILE, []);
    if (!fs.existsSync(EVENTS_FILE)) writeJson(EVENTS_FILE, []);
    
    const uploadDirs = ['uploads/profiles', 'uploads/cv', 'uploads/chat_files'];
    uploadDirs.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });
});
