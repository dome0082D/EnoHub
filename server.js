const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// CONFIGURAZIONE CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'enohub_media', resource_type: 'auto' } });
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// SCHEMI MONGODB (Mappati sulla tua foto)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  profilePic: { type: String, default: 'https://via.placeholder.com/150' },
  title: { type: String, default: 'Qualifica Professionale' },
  location: { type: String, default: 'Località, Italia' },
  isAvailable: { type: Boolean, default: true },
  bio: { type: String, default: 'Racconta la tua esperienza...' },
  specializations: [String],
  certifications: [String],
  media: [{ url: String, public_id: String, fileType: String }]
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  text: String
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// --- API ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false, msg: "Credenziali errate" });
});

app.post('/api/register', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.json({ success: true, user: newUser });
  } catch (err) { res.status(400).json({ success: false, msg: "Email già presente" }); }
});

app.put('/api/profile/:id', async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedUser);
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'name _id profilePic');
  res.json(users);
});

app.post('/api/upload/:userId', upload.single('file'), async (req, res) => {
  const fileData = { url: req.file.path, public_id: req.file.filename, fileType: req.file.mimetype };
  const user = await User.findByIdAndUpdate(req.params.userId, { $push: { media: fileData } }, { new: true });
  res.json(user);
});

app.delete('/api/media/:userId', async (req, res) => {
  const { public_id } = req.body;
  await cloudinary.uploader.destroy(public_id, { resource_type: 'video' });
  const user = await User.findByIdAndUpdate(req.params.userId, { $pull: { media: { public_id } } }, { new: true });
  res.json(user);
});

app.get('/api/messages/:u1/:u2', async (req, res) => {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const storici = await Message.find({
    $or: [ { senderId: req.params.u1, receiverId: req.params.u2 }, { senderId: req.params.u2, receiverId: req.params.u1 } ],
    createdAt: { $gte: cutoff }
  }).sort('createdAt');
  res.json(storici);
});

// SOCKET.IO
io.on('connection', (socket) => {
  socket.on('join', (id) => socket.join(id));
  socket.on('send_msg', async (data) => {
    const msg = new Message(data);
    await msg.save();
    io.to(data.receiverId).emit('receive_msg', msg);
  });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  server.listen(process.env.PORT || 3000, () => console.log("✅ EnoHub Pro Online"));
});
