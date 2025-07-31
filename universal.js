<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Porfyo AI Chatbot Widget</title>
<style>
  /* Google Font - Using Poppins for a modern look */
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

  /* Reset */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Poppins', sans-serif;
    background: #f4f4f9;
  }

  /* Chat Widget Container */
  #chatbot-container {
    position: fixed;
    bottom: 40px;
    right: 40px;
    width: 360px;
    max-height: 80vh;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #fff;
    font-size: 15px;
    transition: all 0.3s ease;
    z-index: 9999999;
  }

  /* Minimized bar */
  #chatbot-minimized {
    background: #6b21a8;
    color: white;
    padding: 16px 24px;
    border-radius: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    transition: background 0.2s, transform 0.2s;
  }
  #chatbot-minimized:hover {
    background: #5b1a8c;
    transform: scale(1.02);
  }
  #chatbot-minimized svg {
    width: 24px;
    height: 24px;
  }

  /* Chat window - hidden initially */
  #chatbot {
    display: none;
    flex-direction: column;
    height: 600px;
    width: 360px;
    background: #fafafa;
    border-radius: 16px;
  }
  #chatbot.active {
    display: flex;
  }

  /* Header */
  #chatbot-header {
    background: #6b21a8;
    color: white;
    padding: 18px 24px;
    font-weight: 700;
    font-size: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 16px 16px 0 0;
  }
  #chatbot-header button {
    cursor: pointer;
    border: none;
    background: transparent;
    color: white;
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }
  #chatbot-header button:hover {
    color: #d8b4fe;
  }

  /* Messages container */
  #chatbot-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 100%;
  }

  /* Message bubbles */
  .message {
    max-width: 80%;
    padding: 12px 16px;
    border-radius: 20px;
    line-height: 1.5;
    white-space: pre-wrap;
    font-size: 14px;
    word-break: break-word;
  }

  .message.user {
    align-self: flex-end;
    background: #6b21a8;
    color: white;
    border-radius: 20px 20px 0 20px;
  }

  .message.ai {
    align-self: flex-start;
    background: #e9d5ff;
    color: #1f2937;
    border-radius: 20px 20px 20px 0;
  }

  /* Bold text styling for AI messages */
  .message.ai strong {
    font-weight: 700;
  }

  /* Loader */
  .message.loading {
    align-self: flex-start;
    background: transparent;
    padding: 10px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6b21a8;
  }
  .loader {
    display: flex;
    gap: 4px;
  }
  .loader span {
    width: 8px;
    height: 8px;
    background: #6b21a8;
    border-radius: 50%;
    animation: bounce 0.6s infinite alternate;
  }
  .loader span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .loader span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes bounce {
    to {
      transform: translateY(-8px);
    }
  }

  /* Input area */
  #chatbot-input-area {
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: white;
    width: 100%;
  }
  #chatbot-input {
    flex: 1;
    font-size: 14px;
    font-family: 'Poppins', sans-serif;
    padding: 12px 16px;
    border-radius: 24px;
    border: 1.5px solid #d1d5db;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    max-width: calc(100% - 90px);
  }
  #chatbot-input:focus {
    border-color: #6b21a8;
    box-shadow: 0 0 0 3px rgba(107, 33, 168, 0.1);
  }
  #chatbot-send-btn {
    background: #6b21a8;
    border: none;
    color: white;
    padding: 12px 16px;
    border-radius: 24px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background-color 0.2s, transform 0.2s;
  }
  #chatbot-send-btn:hover:not(:disabled) {
    background: #5b1a8c;
    transform: scale(1.05);
  }
  #chatbot-send-btn:disabled {
    background: #c084fc;
    cursor: not-allowed;
  }
  #chatbot-send-btn svg {
    width: 18px;
    height: 18px;
  }

  /* Scrollbar styling */
  #chatbot-messages::-webkit-scrollbar {
    width: 8px;
  }
  #chatbot-messages::-webkit-scrollbar-thumb {
    background-color: #a78bfa;
    border-radius: 4px;
  }
  #chatbot-messages::-webkit-scrollbar-track {
    background-color: #f3f4f6;
  }

  /* Responsive */
  @media (max-width: 480px) {
    #chatbot-container {
      width: 90vw;
      bottom: 20px;
      right: 5vw;
    }
    #chatbot {
      width: 90vw;
      height: 70vh;
    }
    #chatbot-input {
      max-width: calc(100% - 80px);
    }
  }
</style>
</head>
<body>

<div id="chatbot-container" aria-label="Porfyo AI chatbot widget">
  <div id="chatbot-minimized" role="button" aria-expanded="false" aria-controls="chatbot" tabindex="0" title="Open chat">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    Chat with Porfyo AI
  </div>

  <section id="chatbot" role="region" aria-live="polite" aria-label="Porfyo AI conversation window">
    <header id="chatbot-header">
      Porfyo AI
      <button id="chatbot-close" aria-label="Close chat">&times;</button>
    </header>

    <div id="chatbot-messages" aria-live="polite" aria-relevant="additions" tabindex="0">
      <!-- Chat messages appear here -->
    </div>

    <form id="chatbot-input-area" aria-label="Send a message">
      <input type="text" id="chatbot-input" placeholder="Type your message..." autocomplete="off" aria-required="true" aria-label="Message input" />
      <button type="submit" id="chatbot-send-btn" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        Send
      </button>
    </form>
  </section>
</div>

<script>
  (() => {
    const container = document.getElementById('chatbot-container');
    const minimizedBar = document.getElementById('chatbot-minimized');
    const chatWindow = document.getElementById('chatbot');
    const closeBtn = document.getElementById('chatbot-close');
    const messagesContainer = document.getElementById('chatbot-messages');
    const form = document.getElementById('chatbot-input-area');
    const inputField = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');

    // Backend API URL - adjust this if needed
    const API_URL = 'http://localhost:3000/ask';

    let isLoading = false;

    // Conversation history
    const conversation = [];

    function parseMarkdown(text) {
      // Convert **text** to <strong>text</strong>
      return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    function appendMessage(text, sender) {
      const el = document.createElement('div');
      el.classList.add('message', sender);
      if (sender === 'loading') {
        el.innerHTML = '<div class="loader"><span></span><span></span><span></span></div> AI is typing...';
      } else if (sender === 'ai') {
        el.innerHTML = parseMarkdown(text);
      } else {
        el.textContent = text;
      }
      messagesContainer.appendChild(el);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function setLoading(loading) {
      isLoading = loading;
      sendBtn.disabled = loading || inputField.value.trim() === '';
      if (loading) {
        appendMessage('', 'loading');
      } else {
        const loadingEls = messagesContainer.querySelectorAll('.message.loading');
        loadingEls.forEach(el => el.remove());
      }
    }

    // Handle enabling send button
    inputField.addEventListener('input', () => {
      sendBtn.disabled = isLoading || inputField.value.trim() === '';
    });

    // Toggle chat window open/close
    function openChat() {
      minimizedBar.style.display = 'none';
      chatWindow.classList.add('active');
      minimizedBar.setAttribute('aria-expanded', 'true');
      inputField.focus();
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    function closeChat() {
      minimizedBar.style.display = 'flex';
      chatWindow.classList.remove('active');
      minimizedBar.setAttribute('aria-expanded', 'false');
      minimizedBar.focus();
    }

    minimizedBar.addEventListener('click', openChat);
    minimizedBar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openChat();
      }
    });
    closeBtn.addEventListener('click', closeChat);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (isLoading) return;
      const message = inputField.value.trim();
      if (!message) return;

      appendMessage(message, 'user');
      conversation.push(message);
      inputField.value = '';
      sendBtn.disabled = true;

      setLoading(true);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        appendMessage(data.answer, 'ai');
        conversation.push(data.answer);
      } catch (err) {
        appendMessage('Sorry, something went wrong. Please try again.', 'ai');
        console.error('Chatbot fetch error:', err);
      } finally {
        setLoading(false);
        inputField.focus();
      }
    });

    // Ensure initial scroll position
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Optional: Open chat automatically
    // openChat();
  })();
</script>

</body>
</html>