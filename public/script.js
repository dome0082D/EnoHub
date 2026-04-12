// Gestione Finestre
function apriModale(id) { document.getElementById(id).style.display = 'block'; }
function chiudiModale(id) { document.getElementById(id).style.display = 'none'; }

// Registrazione con controllo duplicati
document.getElementById('reg-form').onsubmit = async (e) => {
    e.preventDefault();
    const dati = {
        tipo: document.getElementById('tipo').value,
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        pass: document.getElementById('pass').value,
        tel: document.getElementById('tel').value,
        qualifica: document.getElementById('qualifica').value,
        bio: document.getElementById('bio').value
    };

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dati)
    });

    const result = await res.json();
    if(result.success) {
        alert(result.message);
        chiudiModale('modal-reg');
        caricaUtenti();
    } else {
        alert("Errore: " + result.message);
    }
};

// Caricamento Liste B2B
async function caricaUtenti() {
    const res = await fetch('/api/utenti');
    const utenti = await res.json();
    const cDiv = document.getElementById('lista-cantine');
    const sDiv = document.getElementById('lista-sommelier');
    
    cDiv.innerHTML = ''; sDiv.innerHTML = '';

    utenti.forEach(u => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
            <h3>${u.nome}</h3>
            <p><strong>${u.qualifica}</strong></p>
            <p>${u.bio.substring(0, 50)}...</p>
            <button onclick="apriChat('${u.nome}')">Contatta</button>
        `;
        (u.tipo === 'cantina' ? cDiv : sDiv).appendChild(card);
    });
}

// Chat e File
function apriChat(nome) {
    apriModale('modal-chat');
    document.getElementById('chat-target').innerText = "Conversazione con: " + nome;
}

function inviaMsg() {
    const txt = document.getElementById('chat-txt').value;
    const file = document.getElementById('chat-file').files[0];
    if(!txt && !file) return;

    const msg = document.createElement('div');
    msg.className = 'msg sent';
    msg.innerHTML = (txt ? txt : "") + (file ? `<br><small>📄 ${file.name}</small>` : "");
    document.getElementById('chat-msgs').appendChild(msg);
    document.getElementById('chat-txt').value = '';
}

// Avvio
caricaUtenti();