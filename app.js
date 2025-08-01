require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const connection = require('./db/db.js');

const app = express();
app.use(express.json());
app.use(cors()); // Allow all origins - for development only

// ---------- Gemini API Configuration ----------
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ---------- Conversation & User Data ----------
let conversation = [];         // Short conversation for AI context
let fullConversation = [];     // Full conversation array (start to end)
let name = null;               // User name (from form)
let phone = null;              // User phone (from form)
let behavior = null;           // User behavior (natural text)

// ---------- Base Prompt ----------
const BASE_PROMPT = `
You are  "tejX - and you are Porfyro Support Assistant," the official AI customer support agent for **Porfyro** — a modern IT solutions company based in Hyderabad, India. Your goal is to assist users, collect their information naturally, and provide tailored solutions based on their business needs.

Porfyro Overview:
- **Tagline**: Your Partner in Digital Innovation
- **Mission**: Deliver highly responsive, innovative, and quality IT services globally, transforming visionary ideas into high-performing digital solutions.
- **Experience**: 6+ years in IT industry, 15+ team members, 24+ projects, 20+ happy clients.
- **Website**: https://www.porfyro.com/
- **Head Office**: Gachibowli, Hyderabad | **Phone**: [+91 7717368146](tel:+917717368146) | **Email**: [inside@porfyro.com](mailto:inside@porfyro.com)

**Main Services**:
1. **IT Consultancy** - Strategic guidance, infrastructure optimization, digital transformation planning.
2. **Custom Software & Web Development** - End-to-end design, deployment, SEO-ready websites.
3. **Business Management** - E-commerce, digital marketing, growth solutions.
4. **IT Infrastructure** - Network design, server management, hardware procurement.
5. **Data Protection** - Security, breach prevention, business continuity.
6. **Customer Support** - 24/7 availability, fast responses.
7. **Cloud Computing** - Scalable cloud migration & management.

**Products**:
- **Boozexpress** (Beverage delivery solution)
- **Cravify** (Food delivery platform)
- **Pharmxpress** (Pharmacy delivery & healthcare logistics)

**Website Navigation**:
- [Home](https://www.porfyro.com/home.html)
- [About Us](https://www.porfyro.com/about-us.html)
- [Products](https://www.porfyro.com/products.html)
- [Services](https://www.porfyro.com/services.html)
- [Blogs](https://www.porfyro.com/blogs.html)
- [Contact](https://www.porfyro.com/contact.html)
- [Careers](https://www.porfyro.com/careers.html)
- [Terms & Conditions](https://www.porfyro.com/terms-and-conditions.html)

**Instructions**:
- Respond in **Markdown format** with attractive formatting (bold keywords, bullet points, emojis).
- Keep answers **short** (2-3 lines) and use a friendly, human-like tone 😊.
- Include the Porfyro website link [Porfyro](https://www.porfyro.com/) in **every response**.
- When the user says "hi", "hello", or similar greetings, respond exactly with: "Please share your details! 😊 [Porfyro](https://www.porfyro.com/)" to trigger a form on the frontend.
- Naturally collect the user's **name**, **mobile number**, and **behavior** (e.g., "Interested in IT Consultancy and Cloud Computing" or "Not interested") during the conversation:
  - Do not ask for name or phone number directly, as they will be collected via a form triggered by the greeting.
  - Assess their **behavior** based on their input, storing it as a natural string describing their interest and desired services, without informing the user it was noted.
- Store collected info for use in future responses without breaking the conversational flow.
- If the user mentions their business (e.g., interior design, e-commerce), suggest relevant **Porfyro services** or **products** to address their needs.
- Use previous conversation context for natural, non-repetitive replies.
- Provide website navigation links as **Markdown clickable buttons** when relevant.
- If asked about contact info, provide phone and email as clickable Markdown links.
- Politely refuse unrelated queries with a redirect to Porfyro services.
- Use emojis sparingly to enhance engagement (e.g., 😊, 🚀).
- Add .html extension to page links.
- Start by waiting for the user's input, responding with the form trigger if they say "hi" or similar.
- send relevant links as clickable Markdown buttons, e.g., [Contact Us](https://www.porfyro.com/contact.html). when chatting related to question 
- and when started conversaiton you are sending form that time also greeting message with your introduction also.
- and every time contact us link should be clickable button like [Contact Us](https://www.porfyro.com/contact.html)
`;

// ---------- Prompt Builder ----------
function buildPromptFromConversation() {
  let text = BASE_PROMPT + '\n\n';

  if (name || phone || behavior) {
    text += 'User Information:\n';
    if (name) text += `- Name: ${name}\n`;
    if (phone) text += `- Phone: ${phone}\n`;
    if (behavior) text += `- Behavior: ${behavior}\n`;
  }

  text += '\nConversation:\n';
  const recentConvo = conversation.slice(-6);
  recentConvo.forEach((msg, idx) => {
    text += idx % 2 === 0 ? `User: ${msg}\n` : `AI: ${msg}\n`;
  });

  text += 'AI:';
  return text;
}

// ---------- Behavior Extractor ----------
function extractUserInfo(message) {
  const lowerMessage = message.toLowerCase();
  const services = [
    'IT Consultancy', 'Custom Software Development', 'Web Development',
    'Business Management', 'E-commerce', 'Digital Marketing',
    'IT Infrastructure', 'Data Protection', 'Customer Support',
    'Cloud Computing', 'Boozexpress', 'Cravify', 'Pharmxpress'
  ];
  const matched = services.filter(service =>
    lowerMessage.includes(service.toLowerCase())
  );

  if (lowerMessage.includes('interested') || lowerMessage.includes('looking for') || lowerMessage.includes('need')) {
    behavior = matched.length
      ? `Interested in ${matched.join(' and ')}`
      : 'Interested in general IT solutions';
  } else if (lowerMessage.includes('not interested') || lowerMessage.includes('no thanks')) {
    behavior = 'Not interested';
  } else if (matched.length) {
    behavior = `Interested in ${matched.join(' and ')}`;
  }
}

// ---------- Form Submission ----------
app.post('/submit-user-info', (req, res) => {
  const { name: submittedName, phone: submittedPhone } = req.body;
  if (!submittedName || !submittedPhone) {
    return res.status(400).json({ error: 'Please provide both name and phone number.' });
  }
  name = submittedName;
  phone = submittedPhone;
  console.log('Form Submission ->', { name, phone });
  res.json({ message: 'User info submitted successfully.' });
});

// ---------- Chat ----------
app.post('/ask', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Please provide a "message" in the request body.' });

  // Store messages
  conversation.push(message);
  fullConversation.push({ role: 'user', message });

  const promptText = buildPromptFromConversation();

  try {
    const response = await axios.post(
      GEMINI_API_URL,
      { contents: [{ parts: [{ text: promptText }] }] },
      { headers: { 'Content-Type': 'application/json' }, params: { key: GEMINI_API_KEY } }
    );

    let answer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                || "I'm sorry, I couldn't generate an answer at this time. 😔";

    if (!answer.includes('[Porfyro](https://www.porfyro.com/)')) {
      answer += '\n\nExplore more at [Porfyro](https://www.porfyro.com/)! 🚀';
    }

    extractUserInfo(message);
    conversation.push(answer);
    fullConversation.push({ role: 'ai', message: answer });

    res.json({ answer });
  } catch (error) {
    console.error('Gemini API error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Error occurred while communicating with Gemini API.' });
  }
});

// ---------- Reset (Save to DB) ----------
app.post('/reset', async (req, res) => {
  console.log('Conversation End ->', { name, phone, behavior });

  try {
    if (name && phone) {
      // Create chat logs
      const compactChat = [];
      for (let i = 0; i < conversation.length; i += 2) {
        compactChat.push({ message: conversation[i] || '', ai: conversation[i + 1] || '' });
      }

      const compactChatJSON = JSON.stringify(compactChat);
      const fullChatJSON = JSON.stringify(fullConversation);

      // Insert into DB
      const query = `INSERT INTO usersDetails (name, phone, behaviour, chat, fullChat) VALUES (?, ?, ?, ?, ?)`;
      await connection.execute(query, [
        name,
        phone,
        behavior || 'No behavior detected',
        compactChatJSON,
        fullChatJSON
      ]);

      console.log('User data & conversation inserted into DB.');
    }
  } catch (dbErr) {
    console.error('Database insert error:', dbErr.message);
  }

  // Reset in-memory data
  conversation = [];
  fullConversation = [];
  name = null;
  phone = null;
  behavior = null;

  res.json({ message: 'Conversation and user info reset successfully.' });
});

// ---------- Admin Data ----------
app.get('/admin', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM usersDetails');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ success: false, error: 'Error fetching data from database.' });
  }
});

// ---------- Health Check ----------
app.get('/', (req, res) => {
  res.send('Welcome to Porfyro AI Support! Use POST /ask to chat.');
});

// ---------- Start Server ----------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Porfyro AI Support server running on port ${port}`));
