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
  // Inject Supabase credentials directly into the widget at serve time
  // These are PUBLIC keys -- safe to expose in client-side code
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const widgetScript = `
(function() {
  'use strict';

  var scriptTag = document.currentScript || document.querySelector('script[data-chatbot-id]');
  var chatbotId = scriptTag ? scriptTag.getAttribute('data-chatbot-id') : null;

  if (!chatbotId) {
    console.error('VintraStudio: Missing data-chatbot-id attribute');
    return;
  }

  var API_BASE = '';
  try {
    var url = new URL(scriptTag.src);
    API_BASE = url.origin;
  } catch (e) {
    API_BASE = window.location.origin;
  }

  // Supabase connection -- injected server-side, always available
  var SUPABASE_URL = '${supabaseUrl}';
  var SUPABASE_ANON_KEY = '${supabaseAnonKey}';
  var ADMIN_ID = '';

  // Helper: call Supabase REST API directly (has built-in CORS)
  function supabaseRest(table, method, body, query) {
    var fetchUrl = SUPABASE_URL + '/rest/v1/' + table + (query || '');
    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    };
    return fetch(fetchUrl, {
      method: method || 'GET',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r) { return r.json(); });
  }

  // Generate a simple UUID
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  var styles = \`
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
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
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
    .vintra-typing.show { display: block; }
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
    .vintra-input::placeholder { color: #999; }
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
    .vintra-send:disabled { opacity: 0.5; cursor: not-allowed; }
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
    .vintra-branding a { color: #666; text-decoration: none; }
    .vintra-branding a:hover { text-decoration: underline; }
    .vintra-pre-chat {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }
    .vintra-pre-chat.hidden { display: none; }
    .vintra-pre-chat h3 { margin: 0; font-size: 18px; color: #333; }
    .vintra-pre-chat p { margin: 0; font-size: 14px; color: #666; }
    .vintra-pre-chat input {
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      color: #333;
      background: #fff;
    }
    .vintra-pre-chat input::placeholder { color: #999; }
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
    .vintra-pre-chat button:hover { opacity: 0.9; }
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

  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  var config = null;
  var sessionId = null;
  var visitorName = '';
  var visitorEmail = '';
  var isOpen = false;
  var hasStartedChat = false;

  var icons = {
    chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    bot: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
  };

  function createWidget() {
    var container = document.createElement('div');
    container.className = 'vintra-widget-container';
    container.innerHTML =
      '<div class="vintra-chat-window">' +
        '<div class="vintra-header">' +
          '<div class="vintra-header-avatar">' + icons.bot + '</div>' +
          '<div class="vintra-header-info">' +
            '<h4 class="vintra-title">Chat with us</h4>' +
            '<p>We typically reply within minutes</p>' +
          '</div>' +
          '<button class="vintra-close">' + icons.close + '</button>' +
        '</div>' +
        '<div class="vintra-pre-chat">' +
          '<h3>Start a conversation</h3>' +
          '<p>Please provide your details to begin chatting.</p>' +
          '<input type="text" class="vintra-name-input" placeholder="Your name">' +
          '<input type="email" class="vintra-email-input" placeholder="Your email (optional)">' +
          '<button class="vintra-start-btn">Start Chat</button>' +
        '</div>' +
        '<div class="vintra-messages" style="display: none;"></div>' +
        '<div class="vintra-typing">' +
          '<div class="vintra-typing-dots"><span></span><span></span><span></span></div>' +
        '</div>' +
        '<div class="vintra-input-area" style="display: none;">' +
          '<input type="text" class="vintra-input" placeholder="Type your message...">' +
          '<button class="vintra-send">' + icons.send + '</button>' +
        '</div>' +
        '<div class="vintra-branding" style="display: none;">' +
          'Powered by <a href="https://vintrastudio.com" target="_blank">VintraStudio</a>' +
        '</div>' +
      '</div>' +
      '<button class="vintra-launcher">' + icons.chat + '</button>';
    document.body.appendChild(container);

    var launcher = container.querySelector('.vintra-launcher');
    var chatWindow = container.querySelector('.vintra-chat-window');
    var closeBtn = container.querySelector('.vintra-close');
    var messagesContainer = container.querySelector('.vintra-messages');
    var input = container.querySelector('.vintra-input');
    var sendBtn = container.querySelector('.vintra-send');
    var preChat = container.querySelector('.vintra-pre-chat');
    var inputArea = container.querySelector('.vintra-input-area');
    var branding = container.querySelector('.vintra-branding');
    var nameInput = container.querySelector('.vintra-name-input');
    var emailInput = container.querySelector('.vintra-email-input');
    var startBtn = container.querySelector('.vintra-start-btn');
    var header = container.querySelector('.vintra-header');
    var title = container.querySelector('.vintra-title');

    launcher.addEventListener('click', function() { toggleChat(true); });
    closeBtn.addEventListener('click', function() { toggleChat(false); });
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
    startBtn.addEventListener('click', startChat);

    function toggleChat(open) {
      isOpen = open;
      chatWindow.classList.toggle('open', open);
    }

    function startChat() {
      visitorName = nameInput.value.trim() || 'Visitor';
      visitorEmail = emailInput.value.trim();

      var newSessionId = generateId();
      var visitorId = generateId();

      // Insert session directly into Supabase (Supabase REST API has CORS built-in)
      supabaseRest('chat_sessions', 'POST', {
        id: newSessionId,
        chatbot_id: chatbotId,
        admin_id: ADMIN_ID,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_email: visitorEmail || null,
        status: 'active',
        last_message_at: new Date().toISOString()
      }).then(function(data) {
        if (data && data[0]) {
          sessionId = data[0].id;
        } else {
          sessionId = newSessionId;
        }
        hasStartedChat = true;

        preChat.classList.add('hidden');
        messagesContainer.style.display = 'flex';
        inputArea.style.display = 'flex';
        if (config && config.show_branding) {
          branding.style.display = 'block';
        }

        if (config && config.welcome_message) {
          addMessage(config.welcome_message, 'bot');
          // Also save welcome message to DB
          supabaseRest('chat_messages', 'POST', {
            id: generateId(),
            session_id: sessionId,
            admin_id: ADMIN_ID,
            content: config.welcome_message,
            sender_type: 'bot',
            is_read: true
          });
        }

        pollMessages();
      }).catch(function(error) {
        console.error('VintraStudio: Failed to start chat', error);
        startBtn.textContent = 'Retry';
        startBtn.disabled = false;
      });
    }

    function sendMessage() {
      var content = input.value.trim();
      if (!content || !sessionId) return;

      input.value = '';
      addMessage(content, 'visitor');

      // Send directly to Supabase
      supabaseRest('chat_messages', 'POST', {
        id: generateId(),
        session_id: sessionId,
        admin_id: ADMIN_ID,
        content: content,
        sender_type: 'visitor',
        is_read: false
      });

      // Update last_message_at on the session
      supabaseRest('chat_sessions', 'PATCH', {
        last_message_at: new Date().toISOString()
      }, '?id=eq.' + sessionId);
    }

    function addMessage(content, type) {
      var message = document.createElement('div');
      message.className = 'vintra-message ' + type;
      message.textContent = content;
      if (type === 'visitor' && config && config.primary_color) {
        message.style.background = config.primary_color;
      }
      messagesContainer.appendChild(message);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    var knownMessageIds = {};
    function pollMessages() {
      if (!sessionId || !hasStartedChat) return;

      // Query messages directly from Supabase
      supabaseRest('chat_messages', 'GET', null,
        '?session_id=eq.' + sessionId + '&sender_type=neq.visitor&order=created_at.asc&select=id,content,sender_type,created_at'
      ).then(function(messages) {
        if (Array.isArray(messages)) {
          messages.forEach(function(msg) {
            if (!knownMessageIds[msg.id]) {
              knownMessageIds[msg.id] = true;
              // Skip the welcome message we already showed
              if (msg.sender_type === 'bot' && msg.content === config.welcome_message && Object.keys(knownMessageIds).length <= 2) {
                return;
              }
              addMessage(msg.content, msg.sender_type);
            }
          });
        }
      }).catch(function(err) {
        console.error('VintraStudio: Poll error', err);
      });

      setTimeout(pollMessages, 3000);
    }

    function applyConfig(cfg) {
      config = cfg;

      if (cfg.primary_color) {
        launcher.style.background = cfg.primary_color;
        header.style.background = cfg.primary_color;
        sendBtn.style.background = cfg.primary_color;
        startBtn.style.background = cfg.primary_color;
        document.documentElement.style.setProperty('--vintra-primary', cfg.primary_color);
      }
      if (cfg.widget_title) { title.textContent = cfg.widget_title; }
      if (cfg.placeholder_text) { input.placeholder = cfg.placeholder_text; }
      if (cfg.position === 'bottom-left') { container.classList.add('position-left'); }
    }

    return { applyConfig: applyConfig };
  }

  function init() {
    console.log('[VintraStudio] Initializing widget for chatbot:', chatbotId);
    console.log('[VintraStudio] Supabase URL available:', !!SUPABASE_URL);

    // Always fetch config from Supabase directly first (has built-in CORS)
    // Fall back to API route if Supabase URL not available
    var configPromise;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Fetch chatbot config directly from Supabase -- bypasses our server entirely
      configPromise = supabaseRest(
        'chatbot_configs', 'GET', null,
        '?id=eq.' + chatbotId + '&select=id,admin_id,widget_title,welcome_message,primary_color,position,avatar_url,show_branding,placeholder_text,offline_message&limit=1'
      ).then(function(data) {
        if (data && data[0]) return data[0];
        throw new Error('Chatbot not found');
      });
    } else {
      configPromise = fetch(API_BASE + '/api/chat/config?chatbot_id=' + chatbotId)
        .then(function(r) { return r.json(); });
    }

    configPromise.then(function(cfg) {
      console.log('[VintraStudio] Config loaded:', cfg);

      // Store admin_id from config
      if (cfg.admin_id) { ADMIN_ID = cfg.admin_id; }

      var widget = createWidget();
      widget.applyConfig(cfg);
      console.log('[VintraStudio] Widget initialized successfully');
    }).catch(function(error) {
      console.error('[VintraStudio] Failed to initialize:', error);
      // Last resort: create widget with defaults
      var widget = createWidget();
      widget.applyConfig({
        primary_color: '#14b8a6',
        widget_title: 'Chat with us',
        welcome_message: 'Hi! How can we help you today?',
        placeholder_text: 'Type your message...',
        show_branding: true,
        position: 'bottom-right'
      });
    });
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
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
