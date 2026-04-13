let user = JSON.parse(localStorage.getItem('enoUser'));

// Controllo Accesso (Livello 8)
if (!user && !window.location.href.includes('index.html') && !window.location.href.includes('iscrizione.html')) {
    // Permettiamo di vedere le liste da anonimi, ma non di interagire
}

// Funzione Filtro (Livello 11)
function filtra() {
    const nome = document.getElementById('f-nome').value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    cards.forEach(c => {
        const txt = c.innerText.toLowerCase();
        c.style.display = txt.includes(nome) ? "block" : "none";
    });
}

// Caricamento Dinamico Liste (Livello 12)
async function caricaLista(tipo) {
    const res = await fetch('/api/utenti');
    const utenti = await res.json();
    const container = document.getElementById('lista-' + (tipo === 'cantina' ? 'cantine' : 'sommelier'));
    
    utenti.filter(u => u.tipo === tipo).forEach(u => {
        container.innerHTML += `
            <div class="card" onclick="location.href='profilo.html?id=${u.id}'">
                <img src="${u.foto}">
                <h3>${u.nome}</h3>
                <p>${u.citta}</p>
            </div>
        `;
    });
}

// Cancellazione Profilo (Livello 20)
async function eliminaProfilo(id) {
    if(confirm("Vuoi davvero cancellare tutto?")) {
        await fetch(`/api/utenti/${id}`, { method: 'DELETE' });
        localStorage.clear();
        location.href = 'index.html';
    }
}