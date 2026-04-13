/* ============================================================
   ENOHUB ENTERPRISE - SERVER CORE (V21)
   ============================================================ */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Serve per Wikipedia

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'a51c30a51c30a51c30';

const USERS_FILE = path.join(__dirname, 'database/users.json');
const CHATS_FILE = path.join(__dirname, 'database/chats.json');
const EVENTS_FILE = path.join(__dirname, 'database/events.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { return []; } };
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Effettua il login.' });
    try { req.user = jwt.verify(token, SECRET_KEY); next(); } catch (e) { res.status(403).json({ error: 'Sessione scaduta.' }); }
};

// --- API WIKIPEDIA ---
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
    } catch (e) { res.status(404).json({ error: "Vino non trovato su Wikipedia." }); }
});

// --- SPONSORIZZAZIONE ---
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

// --- MODIFICA PROFILO ---
app.put('/api/utenti/update', authenticate, (req, res) => {
    const users = readJson(USERS_FILE);
    const index = users.findIndex(u => u.id === req.user.id);
    if (index !== -1) {
        users[index] = { ...users[index], ...req.body };
        writeJson(USERS_FILE, users);
        res.json({ success: true, user: users[index] });
    } else { res.status(404).json({ error: "Utente non trovato" }); }
});

// ... (Includi qui le rotte di register, login, chat e delete del messaggio precedente)

app.listen(PORT, () => console.log(`🚀 EnoHub Enterprise su porta ${PORT}`));