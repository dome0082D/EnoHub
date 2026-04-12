// --- GESTIONE INTERFACCIA E MODALI ---
function apriModale(id) {
    document.getElementById(id).style.display = 'block';
}

function chiudiModale(id) {
    document.getElementById(id).style.display = 'none';
}

// Chiude la modale se si clicca fuori dal riquadro
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}

// --- LOGICA DI ISCRIZIONE E DATABASE (EnoHub B2B) ---
const regForm = document.getElementById('reg-form');
if(regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const datiProfilo = {
            tipo: document.getElementById('tipo').value,
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            pass: document.getElementById('pass').value,
            tel: document.getElementById('tel').value,
            qualifica: document.getElementById('qualifica').value,
            spec: document.getElementById('spec').value,
            bio: document.getElementById('bio').value,
            dataIscrizione: new Date().toLocaleDateString()
        };

        // Invio al server (Render)
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datiProfilo)
        });

        const result = await response.json();
        if(result.success) {
            alert("Profilo creato con successo! Ora puoi interagire con il network.");
            chiudiModale('modal-reg');
            caricaUtenti(); // Aggiorna le liste in tempo reale
        }
    });
}

// --- CARICAMENTO E RICERCA UTENTI (VETRINA PROFESSIONALE) ---
async function caricaUtenti() {
    const res = await fetch('/api/utenti');
    const utenti = await res.json();
    
    const listaCantine = document.getElementById('lista-cantine');
    const listaSommelier = document.getElementById('lista-sommelier');
    
    // Pulizia liste
    listaCantine.innerHTML = '';
    listaSommelier.innerHTML = '';

    utenti.forEach(u => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <strong>${u.nome}</strong><br>
            <small>${u.spec || 'Generalista'}</small>
            <button onclick="apriChat('${u.nome}')" style="margin-top:5px; padding:2px 5px; font-size:10px;">Contatta</button>
        `;
        
        if(u.tipo === 'cantina') {
            listaCantine.appendChild(card);
        } else {
            listaSommelier.appendChild(card);
        }
    });
}

// --- FUNZIONE CERCA (REATTIVA) ---
function cercaUtenti() {
    let input = document.getElementById('search').value.toLowerCase();
    let cards = document.getElementsByClassName('card');
    
    for (let i = 0; i < cards.length; i++) {
        let txtValue = cards[i].textContent || cards[i].innerText;
        cards[i].style.display = txtValue.toLowerCase().includes(input) ? "" : "none";
    }
}

// --- SISTEMA CHAT E INVIO FILE ---
function apriChat(nome) {
    // Controllo se loggato (logica semplificata per prototipo)
    apriModale('modal-chat');
    document.getElementById('chat-header').innerHTML = `<h3>Chat con ${nome}</h3>`;
}

function inviaMessaggio() {
    const testo = document.getElementById('msg-testo').value;
    const fileInput = document.getElementById('msg-file');
    const box = document.getElementById('chat-messages');

    if (testo || fileInput.files.length > 0) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg sent';
        
        let contenuto = testo;
        if(fileInput.files.length > 0) {
            contenuto += `<br>📎 File allegato: ${fileInput.files[0].name}`;
        }
        
        msgDiv.innerHTML = contenuto;
        box.appendChild(msgDiv);
        
        // Reset
        document.getElementById('msg-testo').value = '';
        fileInput.value = '';
        box.scrollTop = box.scrollHeight;
    }
}

// Avvio automatico
caricaUtenti();
