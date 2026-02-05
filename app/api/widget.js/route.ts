import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET() {
  const widgetScript = `
(function() {
  'use strict';
  
  // Configuration
  const scriptTag = document.currentScript || document.querySelector('script[data-chatbot-id]');
  const chatbotId = scriptTag ? scriptTag.getAttribute('data-chatbot-id') : null;
  
  if (!chatbotId) {
    console.error('VintraStudio: Missing data-chatbot-id attribute');
    return;
  }
  
  // Extract the base URL from the script src
  let API_BASE = '';
  try {
    // scriptTag.src is always resolved to absolute URL by the browser
    const url = new URL(scriptTag.src);
    API_BASE = url.origin;
  } catch (e) {
    // Fallback to current page origin
    API_BASE = window.location.origin;
  }
  console.log('[VintraStudio] API Base:', API_BASE);
  
  // Styles
  const styles = \`
    .vintra-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .vintra-widget-container.position-left {
      right: auto;
      left: 20px;
    }
    .vintra-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .vintra-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
    }
    .vintra-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .vintra-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #fff;
      color: #333;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: vintraSlideUp 0.3s ease;
    }
    .vintra-widget-container.position-left .vintra-chat-window {
      right: auto;
      left: 0;
    }
    .vintra-chat-window.open {
      display: flex;
    }
    @keyframes vintraSlideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .vintra-header {
      padding: 16px 20px;
      color: white;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .vintra-header-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vintra-header-avatar svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    .vintra-header-info h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .vintra-header-info p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.85;
    }
    .vintra-close {
      margin-left: auto;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .vintra-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .vintra-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .vintra-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .vintra-message.bot {
      background: #f0f0f0;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .vintra-message.visitor {
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .vintra-message.admin {
      background: #e8f5e9;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .vintra-typing {
      display: none;
      align-self: flex-start;
      padding: 12px 16px;
      background: #f0f0f0;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
    }
    .vintra-typing.show {
      display: block;
    }
    .vintra-typing-dots {
      display: flex;
      gap: 4px;
    }
    .vintra-typing-dots span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: vintraBounce 1.4s infinite ease-in-out both;
    }
    .vintra-typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .vintra-typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes vintraBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .vintra-input-area {
      padding: 12px 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .vintra-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      color: #333;
      background: #fff;
    }
    .vintra-input::placeholder {
      color: #999;
    }
    .vintra-input:focus {
      border-color: var(--vintra-primary, #14b8a6);
    }
    .vintra-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }
    .vintra-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .vintra-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    .vintra-branding {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #999;
    }
    .vintra-branding a {
      color: #666;
      text-decoration: none;
    }
    .vintra-branding a:hover {
      text-decoration: underline;
    }
    .vintra-pre-chat {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }
    .vintra-pre-chat.hidden {
      display: none;
    }
    .vintra-pre-chat h3 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    .vintra-pre-chat p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }
    .vintra-pre-chat input {
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      color: #333;
      background: #fff;
    }
    .vintra-pre-chat input::placeholder {
      color: #999;
    }
    .vintra-pre-chat input:focus {
      border-color: var(--vintra-primary, #14b8a6);
    }
    .vintra-pre-chat button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .vintra-pre-chat button:hover {
      opacity: 0.9;
    }
    @media (max-width: 480px) {
      .vintra-chat-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        bottom: 70px;
        right: 10px;
        border-radius: 12px;
      }
      .vintra-widget-container.position-left .vintra-chat-window {
        left: 10px;
      }
    }
  \`;
  
  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  // State
  let config = null;
  let sessionId = null;
  let visitorName = '';
  let visitorEmail = '';
  let isOpen = false;
  let hasStartedChat = false;
  
  // Icons
  const icons = {
    chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    bot: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
  };
  
  // Create widget
  function createWidget() {
    const container = document.createElement('div');
    container.className = 'vintra-widget-container';
    container.innerHTML = \`
      <div class="vintra-chat-window">
        <div class="vintra-header">
          <div class="vintra-header-avatar">\${icons.bot}</div>
          <div class="vintra-header-info">
            <h4 class="vintra-title">Chat with us</h4>
            <p>We typically reply within minutes</p>
          </div>
          <button class="vintra-close">\${icons.close}</button>
        </div>
        <div class="vintra-pre-chat">
          <h3>Start a conversation</h3>
          <p>Please provide your details to begin chatting.</p>
          <input type="text" class="vintra-name-input" placeholder="Your name">
          <input type="email" class="vintra-email-input" placeholder="Your email (optional)">
          <button class="vintra-start-btn">Start Chat</button>
        </div>
        <div class="vintra-messages" style="display: none;"></div>
        <div class="vintra-typing">
          <div class="vintra-typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="vintra-input-area" style="display: none;">
          <input type="text" class="vintra-input" placeholder="Type your message...">
          <button class="vintra-send">\${icons.send}</button>
        </div>
        <div class="vintra-branding" style="display: none;">
          Powered by <a href="https://vintrastudio.com" target="_blank">VintraStudio</a>
        </div>
      </div>
      <button class="vintra-launcher">\${icons.chat}</button>
    \`;
    document.body.appendChild(container);
    
    // Elements
    const launcher = container.querySelector('.vintra-launcher');
    const chatWindow = container.querySelector('.vintra-chat-window');
    const closeBtn = container.querySelector('.vintra-close');
    const messagesContainer = container.querySelector('.vintra-messages');
    const input = container.querySelector('.vintra-input');
    const sendBtn = container.querySelector('.vintra-send');
    const preChat = container.querySelector('.vintra-pre-chat');
    const inputArea = container.querySelector('.vintra-input-area');
    const branding = container.querySelector('.vintra-branding');
    const nameInput = container.querySelector('.vintra-name-input');
    const emailInput = container.querySelector('.vintra-email-input');
    const startBtn = container.querySelector('.vintra-start-btn');
    const header = container.querySelector('.vintra-header');
    const title = container.querySelector('.vintra-title');
    
    // Event handlers
    launcher.addEventListener('click', () => toggleChat(true));
    closeBtn.addEventListener('click', () => toggleChat(false));
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    startBtn.addEventListener('click', startChat);
    
    function toggleChat(open) {
      isOpen = open;
      chatWindow.classList.toggle('open', open);
    }
    
    async function startChat() {
      visitorName = nameInput.value.trim() || 'Visitor';
      visitorEmail = emailInput.value.trim();
      
      try {
        const response = await fetch(API_BASE + '/api/chat/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatbot_id: chatbotId,
            visitor_name: visitorName,
            visitor_email: visitorEmail || null
          })
        });
        
        const data = await response.json();
        sessionId = data.session_id;
        hasStartedChat = true;
        
        preChat.classList.add('hidden');
        messagesContainer.style.display = 'flex';
        inputArea.style.display = 'flex';
        if (config?.show_branding) {
          branding.style.display = 'block';
        }
        
        // Add welcome message
        if (config?.welcome_message) {
          addMessage(config.welcome_message, 'bot');
        }
        
        // Start polling for messages
        pollMessages();
      } catch (error) {
        console.error('VintraStudio: Failed to start chat', error);
      }
    }
    
    async function sendMessage() {
      const content = input.value.trim();
      if (!content || !sessionId) return;
      
      input.value = '';
      addMessage(content, 'visitor');
      
      try {
        await fetch(API_BASE + '/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            content: content,
            sender_type: 'visitor'
          })
        });
      } catch (error) {
        console.error('VintraStudio: Failed to send message', error);
      }
    }
    
    function addMessage(content, type) {
      const message = document.createElement('div');
      message.className = 'vintra-message ' + type;
      message.textContent = content;
      if (type === 'visitor' && config?.primary_color) {
        message.style.background = config.primary_color;
      }
      messagesContainer.appendChild(message);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    let lastMessageId = null;
    async function pollMessages() {
      if (!sessionId || !hasStartedChat) return;
      
      try {
        const url = API_BASE + '/api/chat/messages?session_id=' + sessionId + 
          (lastMessageId ? '&after=' + lastMessageId : '');
        const response = await fetch(url);
        const messages = await response.json();
        
        messages.forEach(msg => {
          if (msg.sender_type !== 'visitor') {
            addMessage(msg.content, msg.sender_type);
          }
          lastMessageId = msg.id;
        });
      } catch (error) {
        console.error('VintraStudio: Failed to poll messages', error);
      }
      
      setTimeout(pollMessages, 3000);
    }
    
    // Apply config
    function applyConfig(cfg) {
      config = cfg;
      
      if (cfg.primary_color) {
        launcher.style.background = cfg.primary_color;
        header.style.background = cfg.primary_color;
        sendBtn.style.background = cfg.primary_color;
        startBtn.style.background = cfg.primary_color;
        document.documentElement.style.setProperty('--vintra-primary', cfg.primary_color);
      }
      
      if (cfg.widget_title) {
        title.textContent = cfg.widget_title;
      }
      
      if (cfg.placeholder_text) {
        input.placeholder = cfg.placeholder_text;
      }
      
      if (cfg.position === 'bottom-left') {
        container.classList.add('position-left');
      }
    }
    
    return { applyConfig };
  }
  
  // Initialize
  async function init() {
    console.log('[VintraStudio] Initializing widget for chatbot:', chatbotId);
    try {
      const configUrl = API_BASE + '/api/chat/config?chatbot_id=' + chatbotId;
      console.log('[VintraStudio] Fetching config from:', configUrl);
      
      const response = await fetch(configUrl);
      console.log('[VintraStudio] Config response status:', response.status);
      
      if (!response.ok) {
        console.error('[VintraStudio] Config fetch failed:', response.status, response.statusText);
        // Create widget with default config anyway
        const widget = createWidget();
        widget.applyConfig({
          primary_color: '#14b8a6',
          widget_title: 'Chat with us',
          welcome_message: 'Hi! How can we help you today?',
          placeholder_text: 'Type your message...',
          show_branding: true,
          position: 'bottom-right'
        });
        return;
      }
      
      const config = await response.json();
      console.log('[VintraStudio] Config loaded:', config);
      
      if (config.error) {
        console.warn('[VintraStudio]:', config.error, '- using defaults');
        const widget = createWidget();
        widget.applyConfig({
          primary_color: '#14b8a6',
          widget_title: 'Chat with us',
          welcome_message: 'Hi! How can we help you today?',
          placeholder_text: 'Type your message...',
          show_branding: true,
          position: 'bottom-right'
        });
        return;
      }
      
      const widget = createWidget();
      widget.applyConfig(config);
      console.log('[VintraStudio] Widget initialized successfully');
    } catch (error) {
      console.error('[VintraStudio] Failed to initialize:', error);
      // Create widget with default config on error
      const widget = createWidget();
      widget.applyConfig({
        primary_color: '#14b8a6',
        widget_title: 'Chat with us',
        welcome_message: 'Hi! How can we help you today?',
        placeholder_text: 'Type your message...',
        show_branding: true,
        position: 'bottom-right'
      });
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`

  return new NextResponse(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
