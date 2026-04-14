const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http'); 
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'vinum_elite_2026_secret';

const USERS_FILE = path.join(__dirname, 'database/users.json');
const CHATS_FILE = path.join(__dirname, 'database/chats.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GESTIONE LETTURA/SCRITTURA FILE JSON
const readJson = (file) => {
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } 
    catch (e) { return []; }
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// API: Login Utente
app.post('/api/login', async (req, res) => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.email === req.body.email);
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ success: false, error: "Credenziali non valide." });
    }
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '24h' });
    const { password, ...userSafe } = user;
    res.json({ success: true, token, user: userSafe });
});

// API: Lista Utenti (Per poter selezionare con chi chattare)
app.get('/api/users', (req, res) => {
    const users = readJson(USERS_FILE).map(u => ({ id: u.id, nome: u.nome, tipo: u.tipo }));
    res.json(users);
});

// CHAT REAL-TIME E ARCHIVIO STORICO (Socket.io Wrapper)
io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(userId));
    
    socket.on('private_message', (data) => {
        const chats = readJson(CHATS_FILE);
        const msgCompleto = { ...data, timestamp: new Date() };
        chats.push(msgCompleto);
        writeJson(CHATS_FILE, chats); // Salvataggio nell'archivio storico
        io.to(data.destinatarioId).emit('new_message', msgCompleto);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 ENOHUB LIVE SU PORTA: ${PORT}`);
    if (!fs.existsSync('database')) fs.mkdirSync('database');
});
