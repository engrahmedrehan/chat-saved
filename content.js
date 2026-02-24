/**
 * Modular Site Adapters 
 */
const SITE_ADAPTERS = {
    chatgpt: {
        match: () => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com'),
        name: "ChatGPT",
        extract: () => {
            const messages = [];
            const elements = document.querySelectorAll('div[data-message-author-role]');
            elements.forEach(el => {
                const role = el.getAttribute('data-message-author-role');
                const contentEl = el.querySelector('.markdown') || el;
                const text = contentEl.innerText.trim();
                if (text) messages.push({ role, text, html: extractContentHTML(contentEl) });
            });
            return messages;
        }
    },
    gemini: {
        match: () => window.location.hostname.includes('gemini.google.com'),
        name: "Google Gemini",
        extract: () => {
            const messages = [];
            const elements = document.querySelectorAll('user-query, model-response');
            elements.forEach(el => {
                const role = el.tagName.toLowerCase() === 'user-query' ? 'user' : 'assistant';
                const text = el.innerText.trim();
                if (text) messages.push({ role, text, html: extractContentHTML(el) });
            });
            return messages;
        }
    },
    deepseek: {
        match: () => window.location.hostname.includes('chat.deepseek.com'),
        name: "DeepSeek",
        extract: () => {
            const messages = [];
            const elements = document.querySelectorAll('.fbb737a4, [class*="message"]');
            elements.forEach(el => {
                const isUser = el.querySelector('[class*="user"], .avatar-user');
                const role = isUser ? 'user' : 'assistant';
                const contentEl = el.querySelector('.ds-markdown') || el;
                const text = contentEl.innerText.trim();

                if (text && (!messages.length || messages[messages.length - 1].text !== text)) {
                    messages.push({ role, text, html: extractContentHTML(contentEl) });
                }
            });
            return messages;
        }
    }
};

/**
 * Ensures perfect formula rendering by stripping visual layers
 * and exposing Native MathML to the browser engine for printing
 */
function extractContentHTML(element) {
    const clone = element.cloneNode(true);

    // KaTeX: Remove visual-only layers that require external fonts
    clone.querySelectorAll('.katex-html').forEach(el => el.remove());

    // KaTeX: Reveal and standardize native MathML hiding underneath
    clone.querySelectorAll('.katex-mathml').forEach(el => {
        el.removeAttribute('class');
        el.style.cssText = 'position: static !important; clip: auto !important; width: auto !important; height: auto !important; overflow: visible !important; display: inline-block !important; border: 0 !important; padding: 0 !important; margin: 0 !important; font-size: 1.1em;';
    });

    // Clean up DeepSeek/ChatGPT copy buttons and SVGs
    clone.querySelectorAll('button, svg.copy-icon, ds-icon').forEach(el => el.remove());

    return clone.innerHTML;
}

class ChatExtractor {
    constructor() {
        this.currentAdapter = null;
        this.init();
    }

    init() {
        this.detectSite();
        if (this.currentAdapter) {
            this.injectFloatingButton();
            this.setupAutoSaveObserver();
        }
    }

    detectSite() {
        for (const key in SITE_ADAPTERS) {
            if (SITE_ADAPTERS[key].match()) {
                this.currentAdapter = SITE_ADAPTERS[key];
                break;
            }
        }
    }

    injectFloatingButton() {
        if (document.getElementById('ai-chat-archiver-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ai-chat-archiver-btn';
        btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      EXTRACT_DATA
    `;

        btn.addEventListener('click', () => this.saveCurrentChat());
        document.body.appendChild(btn);
    }

    async saveCurrentChat() {
        const btn = document.getElementById('ai-chat-archiver-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'UPLOADING...';
        btn.style.opacity = '0.8';

        const messages = this.currentAdapter.extract();

        if (messages.length === 0) {
            alert("No chat messages found to save!");
            this.resetButton(btn, originalText);
            return;
        }

        const titleCandidate = document.title.replace(' - ChatGPT', '').replace('Gemini', 'Gemini Chat').trim() || 'Untitled Chat';

        const payload = {
            website: this.currentAdapter.name,
            url: window.location.href,
            title: titleCandidate,
            messages: messages
        };

        chrome.runtime.sendMessage({ action: 'saveChat', data: payload }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Runtime Error: ", chrome.runtime.lastError);
                alert("Failed to save. Extension might have refreshed.");
            } else if (response && response.success) {
                btn.innerHTML = 'SAVED_OK \u2713';
                btn.classList.add('saved-success');
                setTimeout(() => this.resetButton(btn, originalText), 3000);
            }
        });
    }

    resetButton(btn, text) {
        btn.innerHTML = text;
        btn.style.opacity = '1';
        btn.classList.remove('saved-success');
    }

    setupAutoSaveObserver() {
        chrome.storage.local.get(['autoSave'], (result) => {
            if (result.autoSave) {
                let saveTimeout;
                const observer = new MutationObserver(() => {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.saveCurrentChat();
                    }, 15000);
                });

                observer.observe(document.body, { childList: true, subtree: true });
            }
        });
    }
}

// Ensure execution happens after DOM starts parsing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChatExtractor());
} else {
    new ChatExtractor();
}
