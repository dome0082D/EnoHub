const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Cartelle storage
const DIRS = ['database', 'public/uploads/media', 'public/uploads/profiles'];
DIRS.forEach(d => fs.ensureDirSync(path.join(__dirname, d)));

const USERS_FILE = 'database/users.json';
const CHATS_FILE = 'database/chats.json';
const MEDIA_FILE = 'database/media.json';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurazione Caricamento File (Video/Immagini/Doc)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/media'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper JSON
const getData = (file) => fs.readJsonSync(file, { throws: false }) || [];
const saveData = (file, data) => fs.writeJsonSync(file, data, { spaces: 2 });

// --- API AUTH ---
app.post('/api/register', async (req, res) => {
    const users = getData(USERS_FILE);
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = { id: Date.now().toString(), ...req.body, password: hashedPassword };
    users.push(newUser);
    saveData(USERS_FILE, users);
    res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
    const users = getData(USERS_FILE);
    const user = users.find(u => u.email === req.body.email);
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } else res.status(401).json({ success: false });
});

// --- API MEDIA ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    const media = getData(MEDIA_FILE);
    const newMedia = {
        id: Date.now().toString(),
        ownerId: req.body.ownerId,
        url: '/uploads/media/' + req.file.filename,
        name: req.file.originalname,
        type: req.file.mimetype,
        date: new Date()
    };
    media.push(newMedia);
    saveData(MEDIA_FILE, media);
    res.json(newMedia);
});

app.get('/api/media', (req, res) => res.json(getData(MEDIA_FILE)));

app.delete('/api/media/:id', (req, res) => {
    let media = getData(MEDIA_FILE);
    const item = media.find(m => m.id === req.params.id);
    if(item) {
        fs.removeSync(path.join(__dirname, 'public', item.url));
        media = media.filter(m => m.id !== req.params.id);
        saveData(MEDIA_FILE, media);
    }
    res.json({ success: true });
});

// --- SOCKET.IO CHAT CON ARCHIVIO 2 MESI ---
io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(userId));
    
    socket.on('get_history', ({ me, to }) => {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const history = getData(CHATS_FILE).filter(m => 
            ((m.from === me && m.to === to) || (m.from === to && m.to === me)) &&
            new Date(m.time) > twoMonthsAgo
        );
        socket.emit('chat_history', history);
    });

    socket.on('send_msg', (data) => {
        const chats = getData(CHATS_FILE);
        const msg = { ...data, time: new Date() };
        chats.push(msg);
        saveData(CHATS_FILE, chats);
        io.to(data.to).emit('new_msg', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`EnoHub Enterprise Running on ${PORT}`));