const API_URL = 'http://localhost:3000/api';
let currentUser = JSON.parse(localStorage.getItem('enoUser')) || null;
let isLoginMode = true;
let currentProfileView = null; // ID dell'utente visualizzato

window.onload = () => {
    updateNav();
    loadUsers();
};

function updateNav() {
    const nav = document.getElementById('auth-nav');
    if (currentUser) {
        nav.innerHTML = `<strong>${currentUser.nome}</strong> <button onclick="logout()" style="margin-left:10px;">Esci</button>`;
    } else {
        nav.innerHTML = `<button onclick="openModal('auth-modal')" class="btn" style="margin:0; width:auto;">Accedi / Iscriviti</button>`;
    }
}

// --- GESTIONE UTENTI E RICERCA ---
async function loadUsers() {
    const res = await fetch(`${API_URL}/users`);
    const users = await res.json();
    const filter = document.getElementById('searchInput').value.toLowerCase();
    
    const cList = document.getElementById('cantine-list');
    const sList = document.getElementById('sommelier-list');
    cList.innerHTML = ''; sList.innerHTML = '';

    users.filter(u => u.nome.toLowerCase().includes(filter) || (u.specializzazione && u.specializzazione.toLowerCase().includes(filter)))
         .forEach(u => {
            const avatar = u.profilePic ? u.profilePic : 'https://via.placeholder.com/50';
            const card = `
                <div class="user-card" onclick="openProfile('${u.id}')">
                    <img src="${avatar}" class="user-avatar">
                    <div>
                        <strong>${u.nome}</strong><br>
                        <small>${u.qualifica || 'Utente'}</small>
                    </div>
                </div>`;
            if (u.ruolo === 'cantina') cList.innerHTML += card;
            else sList.innerHTML += card;
    });
}

// --- GESTIONE PROFILO E CHAT ---
async function openProfile(userId) {
    const res = await fetch(`${API_URL}/users`);
    const users = await res.json();
    const user = users.find(u => u.id === userId);
    currentProfileView = user;

    const avatar = user.profilePic ? user.profilePic : 'https://via.placeholder.com/100';
    document.getElementById('profile-details').innerHTML = `
        <div style="display:flex; gap:20px; align-items:center;">
            <img src="${avatar}" style="width:100px; height:100px; border-radius:10px; object-fit:cover;">
            <div>
                <h2>${user.nome}</h2>
                <p><strong>Qualifica:</strong> ${user.qualifica || '-'}</p>
                <p><strong>Specializzazione:</strong> ${user.specializzazione || '-'}</p>
                <p><strong>Contatti:</strong> ${user.email} | ${user.telefono || '-'}</p>
            </div>
        </div>
        <div style="margin-top:20px;">
            <strong>Biografia:</strong>
            <p>${user.bio || 'Nessuna biografia inserita.'}</p>
        </div>
    `;

    // Logica Visibilità Chat
    if (currentUser && currentUser.id !== user.id) {
        document.getElementById('chat-area').classList.remove('hidden');
        document.getElementById('chat-warning').classList.add('hidden');
        loadMessages();
    } else {
        document.getElementById('chat-area').classList.add('hidden');
        if (!currentUser) document.getElementById('chat-warning').classList.remove('hidden');
        else document.getElementById('chat-warning').classList.add('hidden');
    }

    openModal('profile-modal');
}

async function loadMessages() {
    const res = await fetch(`${API_URL}/messages/${currentUser.id}/${currentProfileView.id}`);
    const msgs = await res.json();
    const box = document.getElementById('chat-box');
    box.innerHTML = '';
    
    msgs.forEach(m => {
        const isMine = m.sender === currentUser.id;
        let content = m.text;
        if (m.fileUrl) {
            content += `<br><a href="${m.fileUrl}" target="_blank">📄 Scarica Allegato (${m.fileName})</a>`;
        }
        box.innerHTML += `<div class="chat-msg ${isMine ? 'mine' : ''}"><strong>${isMine ? 'Tu' : currentProfileView.nome}:</strong><br>${content}</div>`;
    });
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const text = document.getElementById('chat-message').value;
    const fileInput = document.getElementById('chat-file');
    let fileUrl = null, fileName = null;

    if (!text && fileInput.files.length === 0) return;

    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        fileUrl = uploadData.fileUrl;
        fileName = uploadData.fileName;
    }

    const msgData = {
        sender: currentUser.id,
        receiver: currentProfileView.id,
        text: text,
        fileUrl: fileUrl,
        fileName: fileName
    };

    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
    });

    document.getElementById('chat-message').value = '';
    document.getElementById('chat-file').value = '';
    loadMessages();
}

// --- GESTIONE AUTENTICAZIONE ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Accedi a EnoHub" : "Iscriviti a EnoHub";
    document.getElementById('register-fields').classList.toggle('hidden', isLoginMode);
    document.querySelector('#auth-form .btn').innerText = isLoginMode ? "Accedi" : "Registrati";
    
    // Rimuovi "required" dai campi se in login
    const isRequired = !isLoginMode;
    document.getElementById('nome').required = isRequired;
    document.getElementById('privacy').required = isRequired;
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('enoUser', JSON.stringify(currentUser));
            location.reload();
        } else {
            alert("Credenziali errate.");
        }
    } else {
        // Registrazione con eventuale upload foto profilo
        let profilePicUrl = null;
        const picInput = document.getElementById('profileFile');
        if (picInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', picInput.files[0]);
            const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
            profilePicUrl = (await uploadRes.json()).fileUrl;
        }

        const userData = {
            email, password,
            ruolo: document.getElementById('ruolo').value,
            nome: document.getElementById('nome').value,
            telefono: document.getElementById('telefono').value,
            qualifica: document.getElementById('qualifica').value,
            specializzazione: document.getElementById('specializzazione').value,
            bio: document.getElementById('bio').value,
            profilePic: profilePicUrl
        };

        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (res.ok) {
            alert("Iscrizione completata! Ora puoi accedere.");
            toggleAuthMode();
        } else {
            const err = await res.json();
            alert(err.error);
        }
    }
}

function logout() { localStorage.removeItem('enoUser'); location.reload(); }
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
