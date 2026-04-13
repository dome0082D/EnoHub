// VARIABILI DI STATO (Il "Cervello" del sito)
let utenteLoggato = JSON.parse(localStorage.getItem('user')) || null;
let tuttiUtenti = [];
let vistaCorrente = 'home';

// LIVELLO 3: NAVIGAZIONE TRA LE 20 PAGINE
function mostraPagina(pageId, data = null) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if(target) target.classList.add('active');
    
    if(pageId === 'profilo-dettaglio' && data) {
        renderizzaProfiloDettagliato(data);
    }
}

// LIVELLO 10: REGISTRAZIONE CON CONTROLLO EMAIL & FILE CV
async function registraUtente(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    
    // Controllo duplicati (Livello di Validazione)
    const check = await fetch(`/api/check-email?email=${email}`);
    const res = await check.json();
    if(res.exists) return alert("Errore: Email già registrata!");

    // Preparazione dati con Storytelling (dal PDF)
    const formData = new FormData(e.target); 
    // Usiamo FormData per gestire l'invio di file (CV e Foto Profilo)
    
    const response = await fetch('/api/register', {
        method: 'POST',
        body: formData // Invia file e testi insieme
    });
}

// LIVELLO 12: RENDER DINAMICO PROFILI (Immagine 1 e 2)
function renderizzaProfiloDettagliato(utente) {
    const container = document.getElementById('profilo-content');
    container.innerHTML = `
        <div class="profile-header">
            <img src="${utente.foto || 'default-avatar.png'}" class="profile-img-top-left">
            <h1>${utente.nome}</h1>
            <p class="tag">${utente.qualifica}</p>
        </div>
        <div class="profile-body">
            <div class="bio-box"><h3>Biografia</h3><p>${utente.bio}</p></div>
            <div class="data-box">
                <p>📧 ${utente.email}</p>
                <p>📞 ${utente.tel}</p>
                ${utente.cv ? `<a href="${utente.cv}" target="_blank">📄 Scarica CV/Documenti</a>` : ''}
            </div>
            <button onclick="apriChat('${utente.id}')" class="btn-chat">Invia Messaggio / File</button>
        </div>
    `;
}

// Inizializzazione
window.onload = async () => {
    const res = await fetch('/api/utenti');
    tuttiUtenti = await res.json();
    aggiornaInterfaccia();
};
