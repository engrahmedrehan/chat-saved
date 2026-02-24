// Background service worker for handling cross-context operations

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['chats', 'autoSave'], (result) => {
        if (!result.chats) {
            chrome.storage.local.set({ chats: [] });
        }
        if (result.autoSave === undefined) {
            chrome.storage.local.set({ autoSave: false });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveChat') {
        chrome.storage.local.get(['chats'], (result) => {
            let chats = result.chats || [];

            const newChat = {
                id: Date.now().toString(),
                website: request.data.website,
                url: request.data.url,
                title: request.data.title || `Chat - ${new Date().toLocaleString()}`,
                messages: request.data.messages,
                timestamp: new Date().toISOString()
            };

            chats.unshift(newChat);

            chrome.storage.local.set({ chats: chats }, () => {
                sendResponse({ success: true, id: newChat.id });
            });
        });
        return true;
    }
});
