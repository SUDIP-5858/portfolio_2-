document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('aiChatWidget');
  const toggleBtn = document.getElementById('chatToggleBtn');
  const closeBtn = document.getElementById('chatCloseBtn');
  const sendBtn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');
  const messagesContainer = document.getElementById('chatMessages');

  let isOpen = false;
  let isWaitingForResponse = false;
  
  // Chat history
  let messages = [
    {
      role: 'system',
      content: `You are an AI assistant for Sudipta Dey's professional portfolio. Sudipta is an AI Engineer and Creative Developer based in Kolkata, India, graduating B.Tech in CSE (AIML) in 2026. Keep your answers brief, professional, and friendly. Do not invent information. If you don't know something about Sudipta, say so politely.`
    }
  ];

  // Toggle chat panel
  const toggleChat = () => {
    isOpen = !isOpen;
    if (isOpen) {
      widget.classList.add('is-open');
      input.focus();
    } else {
      widget.classList.remove('is-open');
    }
  };

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // Handle Enter to send (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isWaitingForResponse) return;

    // Add user message
    addMessageToUI('user', text);
    messages.push({ role: 'user', content: text });
    
    input.value = '';
    input.style.height = 'auto'; // Reset textarea height
    isWaitingForResponse = true;
    sendBtn.disabled = true;

    // Add typing indicator
    const typingId = addTypingIndicator();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch('http://localhost:20128/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No API key needed for OmniRoute's free 'auto' endpoint natively
        },
        body: JSON.stringify({
          model: 'auto',
          messages: messages
        })
      });

      removeTypingIndicator(typingId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices && data.choices[0] && data.choices[0].message.content;
      
      if (reply) {
        addMessageToUI('ai', reply);
        messages.push({ role: 'assistant', content: reply });
      } else {
        throw new Error('Empty response from AI Gateway');
      }
    } catch (error) {
      console.error('Chat error:', error);
      removeTypingIndicator(typingId);
      addMessageToUI('ai', 'Oops! I am having trouble connecting to my local AI gateway right now. Please ensure OmniRoute is running on localhost:20128 (via `omniroute start`).');
    } finally {
      isWaitingForResponse = false;
      sendBtn.disabled = false;
      input.focus();
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function addMessageToUI(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message chat-message--${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-message__bubble';
    bubble.textContent = text;
    
    msgDiv.appendChild(bubble);
    messagesContainer.appendChild(msgDiv);
  }

  function addTypingIndicator() {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message chat-message--ai';
    msgDiv.id = id;
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-message__bubble chat-typing';
    
    bubble.innerHTML = '<span></span><span></span><span></span>';
    
    msgDiv.appendChild(bubble);
    messagesContainer.appendChild(msgDiv);
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
});
