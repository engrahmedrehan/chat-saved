# Chat Saved - Chrome Extension

"Chat Saved" is a lightweight and efficient Chrome extension designed to help users quickly export and save their chat conversations. Built on the modern Manifest V3 architecture, it seamlessly reads conversation elements from the active tab and processes them for easy downloading and storage.

## 🚀 Key Features
- **Instant Chat Export**: Quickly extract and save text from supported chat interfaces directly to your local machine.
- **Privacy First**: Uses a secure content script (`content.js`) that only interacts with the webpage when triggered. No data is sent to external servers.
- **Manifest V3 Compliant**: Built using the latest Chrome Extension standards for enhanced security, performance, and long-term support.
- **Service Worker Architecture**: Utilizes an efficient background service worker (`background.js`) to handle logic without bogging down your browser.

## 🛠 Installation (Development Mode)
Since this extension is currently in development, you can load it locally:
1. Clone this repository or download the source code as a `.zip` file and extract it.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the `chat-saved` folder (where `manifest.json` is located).

## 📂 Project Structure

```text
├── chat-saved/
│   ├── background.js    # Service worker managing background processes and tab communication
│   ├── content.js       # Script for DOM interaction and extracting chat text
│   ├── icon.svg         # Scalable vector icon for the extension
│   ├── icon128.png      # High-resolution icon for the Chrome Web Store
│   └── manifest.json    # Extension configuration and permissions
