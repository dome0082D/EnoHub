/* ============================================================
   ENOHUB PROJECT - API CLIENT
   Manages client-side storage (memory), API calls, 
   authentication, profile retrieval, and chat functions.
   ============================================================ */

const EnoHubApi = (() => {
  // Use localStorage to "remember" users across pages
  const API_URL = 'http://localhost:3000/api'; // The base URL for our backend
  const USERS_PATH = '/utenti';
  const CHATS_PATH = '/chat';
  const EVENTS_PATH = '/eventi';
  const REGISTER_PATH = '/register';
  const LOGIN_PATH = '/login';

  // --- PRIVATE UTILITIES ---
  const fetchApi = async (path, method = 'GET', data = null, isFile = false) => {
    const headers = {};
    const token = localStorage.getItem('enoUserToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = {
      method,
      headers
    };

    if (data) {
      if (isFile) {
        // Use FormData for file uploads (Multer handles this)
        config.body = data;
        // Don't set Content-Type header; FormData does it automatically
      } else {
        headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(API_URL + path, config);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || response.statusText);
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  // --- PUBLIC API ---
  return {
    // 1. Auth & Session Management
    register: async (formData) => {
      // isFile=true because registration form includes profile pic
      return fetchApi(REGISTER_PATH, 'POST', formData, true); 
    },
    
    login: async (email, password) => {
      const result = await fetchApi(LOGIN_PATH, 'POST', { email, password });
      if (result.success) {
        // Save user data to localStorage (the "memory")
        localStorage.setItem('enoUser', JSON.stringify(result.user));
        localStorage.setItem('enoUserToken', result.token);
        return { success: true, userType: result.user.tipo };
      }
      return { success: false, error: result.error };
    },
    
    logout: () => {
      // Clear memory and redirect
      localStorage.removeItem('enoUser');
      localStorage.removeItem('enoUserToken');
      window.location.href = '../../auth/login.html';
    },

    isLoggedIn: () => {
      return !!localStorage.getItem('enoUser Token');
    },

    getUserName: () => {
        const user = localStorage.getItem('enoUser');
        return user ? JSON.parse(user).nome + ' ' + JSON.parse(user).cognome : '';
    },

    getUserAvatar: () => {
        const user = localStorage.getItem('enoUser');
        return user ? JSON.parse(user).foto : null;
    },

    getUserType: () => {
        const user = localStorage.getItem('enoUser');
        return user ? JSON.parse(user).tipo : null;
    },

    // 2. Profile Retrieval
    getSommelierProfile: async (id) => {
      try {
        const data = await fetchApi(`${USERS_PATH}/${id}`);
        if (data) EnoHubUI.renderSommelierProfile(data);
      } catch (e) { EnoHubUI.showError(); }
    },
    
    getCantinaProfile: async (id) => {
      try {
        const data = await fetchApi(`${USERS_PATH}/${id}`);
        if (data) EnoHubUI.renderCantinaProfile(data);
      } catch (e) { EnoHubUI.showError(); }
    },
    
    getSommelierList: async () => {
        return fetchApi(`${USERS_PATH}?tipo=sommelier`);
    },

    getCantineList: async () => {
        return fetchApi(`${USERS_PATH}?tipo=cantina`);
    },

    // 3. Chat functions
    getPrivateChatMessages: async (conversationId) => {
        try {
            const data = await fetchApi(`${CHATS_PATH}/${conversationId}`);
            if (data) EnoHubUI.renderChat(data);
        } catch (e) { EnoHubUI.showError(); }
    },

    sendChatMessage: async (conversationId, messageData, file=null) => {
        const formData = new FormData();
        formData.append('conversationId', conversationId);
        formData.append('testo', messageData);
        if (file) formData.append('allegato', file);
        // isFile=true because it handles any file type attachment
        return fetchApi(`${CHATS_PATH}/send`, 'POST', formData, true); 
    },
    
    // 4. Events functions
    getEventsList: async () => {
        return fetchApi(EVENTS_PATH);
    },
    
    createEvent: async (eventData) => {
        return fetchApi(`${EVENTS_PATH}/create`, 'POST', eventData);
    },
    
    // 5. Profile Deletion (Level 20 Account Deletion)
    deleteProfile: async () => {
        const user = JSON.parse(localStorage.getItem('enoUser'));
        if (confirm("Sei sicuro di voler cancellare DEFINITIVAMENTE il tuo profilo e tutti i file correlati? L'azione non è reversibile.")) {
            try {
                const result = await fetchApi(`${USERS_PATH}/${user.id}`, 'DELETE');
                if (result.success) {
                    EnoHubApi.logout();
                } else {
                    alert('Errore nella cancellazione: ' + result.error);
                }
            } catch (e) { alert('Errore di connessione.'); }
        }
    }
  };
})();
