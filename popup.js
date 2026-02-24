document.addEventListener('DOMContentLoaded', () => {
    const chatList = document.getElementById('chatList');
    const autoSaveToggle = document.getElementById('autoSaveToggle');

    // 1. Initial State Initialization
    chrome.storage.local.get(['chats', 'autoSave'], (result) => {
        autoSaveToggle.checked = result.autoSave || false;
        renderChats(result.chats || []);
    });

    // 2. Event Listeners Config
    autoSaveToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ autoSave: e.target.checked });
    });

    function renderChats(chats) {
        chatList.innerHTML = '';

        if (chats.length === 0) {
            chatList.innerHTML = `<div class="no-chats">No saved chats yet.<br>Visit an AI chat site and click the "Save Chat" button.</div>`;
            return;
        }

        chats.forEach(chat => {
            const card = document.createElement('div');
            card.className = 'chat-card';

            const dateStr = new Date(chat.timestamp).toLocaleString();

            card.innerHTML = `
                <div class="chat-header">
                    <div style="width: 100%;">
                        <h3 class="chat-title" title="Double click to rename" data-id="${chat.id}">${escapeHtml(chat.title)}</h3>
                        <div class="chat-meta">
                            <span>${chat.website}</span> &bull; <span>${dateStr}</span>
                        </div>
                    </div>
                </div>
                <div class="chat-actions">
                    <div class="export-group">
                        <button class="btn export-pdf" data-id="${chat.id}">PDF</button>
                        <button class="btn export-txt" data-id="${chat.id}">TXT</button>
                        <button class="btn export-md" data-id="${chat.id}">MD</button>
                        <button class="btn export-json" data-id="${chat.id}">JSON</button>
                    </div>
                    <button class="btn delete" data-id="${chat.id}">Delete</button>
                </div>
            `;
            chatList.appendChild(card);
        });

        attachInteractionEvents(chats);
    }

    function attachInteractionEvents(chats) {
        // Renaming logic
        document.querySelectorAll('.chat-title').forEach(titleEl => {
            titleEl.addEventListener('dblclick', (e) => {
                const el = e.target;
                const currentText = el.innerText;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'title-edit-input';
                input.value = currentText;

                const saveNewTitle = () => {
                    const newTitle = input.value.trim() || currentText;
                    const id = el.getAttribute('data-id');
                    const chatIndex = chats.findIndex(c => c.id === id);
                    if (chatIndex > -1) {
                        chats[chatIndex].title = newTitle;
                        chrome.storage.local.set({ chats: chats }, () => renderChats(chats));
                    }
                };

                input.addEventListener('blur', saveNewTitle);
                input.addEventListener('keypress', (kbdE) => {
                    if (kbdE.key === 'Enter') input.blur();
                });

                el.replaceWith(input);
                input.focus();
            });
        });

        // Deleting logic
        document.querySelectorAll('.btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const updatedChats = chats.filter(c => c.id !== id);
                chrome.storage.local.set({ chats: updatedChats }, () => renderChats(updatedChats));
            });
        });

        // Export PDF Window Route
        document.querySelectorAll('.btn.export-pdf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const url = chrome.runtime.getURL(`print.html?id=${id}`);
                chrome.tabs.create({ url });
            });
        });

        // Normal File Flow Exports
        document.querySelectorAll('.btn.export-txt').forEach(btn => {
            btn.addEventListener('click', (e) => exportData(getChatById(chats, e.target), 'txt'));
        });
        document.querySelectorAll('.btn.export-md').forEach(btn => {
            btn.addEventListener('click', (e) => exportData(getChatById(chats, e.target), 'md'));
        });
        document.querySelectorAll('.btn.export-json').forEach(btn => {
            btn.addEventListener('click', (e) => exportData(getChatById(chats, e.target), 'json'));
        });
    }

    function getChatById(chats, target) {
        return chats.find(c => c.id === target.getAttribute('data-id'));
    }

    function exportData(chat, format) {
        if (!chat) return;

        let content = '';
        let mimeType = 'text/plain';

        switch (format) {
            case 'json':
                // We exclude the raw generated HTML to keep json footprint clean
                const cleanedChat = { ...chat, messages: chat.messages.map(m => ({ role: m.role, text: m.text })) };
                content = JSON.stringify(cleanedChat, null, 2);
                mimeType = 'application/json';
                break;
            case 'txt':
                content = `Title: ${chat.title}\r\nWebsite: ${chat.website}\r\nDate: ${new Date(chat.timestamp).toLocaleString()}\r\n`;
                content += '==================================================\r\n\r\n';
                chat.messages.forEach(msg => {
                    content += `[${msg.role.toUpperCase()}]\r\n${msg.text}\r\n\r\n`;
                });
                break;
            case 'md':
                content = `# ${chat.title}\n\n**Source:** ${chat.website}\n**Date:** ${new Date(chat.timestamp).toLocaleString()}\n\n---\n\n`;
                chat.messages.forEach(msg => {
                    const roleFormatted = msg.role === 'user' ? '🧑 **User**' : '🤖 **Assistant**';
                    content += `### ${roleFormatted}\n\n${msg.text}\n\n`;
                });
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ChatExport_${chat.website.replace(' ', '')}_${chat.id}.${format}`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
});
