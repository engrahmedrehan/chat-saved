document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>No chat ID provided.</h2>";
        return;
    }

    chrome.storage.local.get(['chats'], (result) => {
        const chats = result.chats || [];
        const chat = chats.find(c => c.id === id);

        if (!chat) {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Chat not found in local storage.</h2>";
            return;
        }

        // Apply meta information
        document.title = `${chat.title} - PDF Export`;
        document.getElementById('chat-title').innerText = chat.title;
        document.getElementById('chat-meta').innerText = `Source: ${chat.website}   |   Date: ${new Date(chat.timestamp).toLocaleString()}`;

        const container = document.getElementById('chat-content');

        // Render rich HTML payload where formulas and tables are naturally included
        chat.messages.forEach(msg => {
            const el = document.createElement('div');
            el.className = `message ${msg.role}`;

            const roleEl = document.createElement('div');
            roleEl.className = `role ${msg.role}`;
            roleEl.innerText = msg.role === 'user' ? '🧑 User' : '🤖 Assistant';

            const contentEl = document.createElement('div');
            contentEl.className = 'content';

            // Prefer the precise HTML payload that captured native MathML!
            // Fallback to text if missing for older saves.
            contentEl.innerHTML = msg.html || escapeHtml(msg.text).replace(/\n/g, '<br>');

            el.appendChild(roleEl);
            el.appendChild(contentEl);
            container.appendChild(el);
        });

        // Small delay to ensure all DOM elements and complex native MathML finish rendering precisely
        setTimeout(() => {
            window.print();
        }, 600);
    });

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
});
