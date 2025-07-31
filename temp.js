require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow all origins - for development only

// Gemini API setup (use your valid API key)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Conversation history and user info
let conversation = [];
let name = null;
let phone = null;
let behavior = null; // Store as natural string, e.g., "Interested in IT Consultancy and Cloud Computing"

// Porfyro Company Info & instructions prompt for Gemini
const BASE_PROMPT = `
You are "Porfyro Support Assistant," the official AI customer support agent for **Porfyro** — a modern IT solutions company based in Hyderabad, India. Your goal is to assist users, collect their information naturally, and provide tailored solutions based on their business needs.

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
- Respond clearly, concisely, and conversationally in **Markdown format**.
- Keep answers short (1-3 sentences) and use a friendly, human-like tone 😊.
- Naturally collect the user's **name**, **mobile number**, and **behavior** (e.g., "Interested in IT Consultancy and Cloud Computing" or "Not interested") during the conversation:
  - Ask for their name politely if unknown (e.g., "May I have your name, please?").
  - Request their mobile number naturally (e.g., "Could you share your contact number so we can follow up?").
  - Assess their **behavior** based on their input, storing it as a natural string describing their interest and desired services.
- Store collected info for use in future responses without breaking the conversational flow.
- If the user mentions their business (e.g., interior design, e-commerce), suggest relevant **Porfyro services** or **products** to address their needs.
- Use previous conversation context for natural, non-repetitive replies.
- Provide website navigation links as **Markdown clickable buttons** when relevant.
- If asked about contact info, provide phone and email as clickable Markdown links.
- Politely refuse unrelated queries with a redirect to Porfyro services.
- Use emojis sparingly to enhance engagement (e.g., 😊, 🚀).
- Add .html extension to page links.
- Start by asking how you can assist or requesting the user's name if unknown.
- answer very very short 2,3 lines and also dont show user we have noted that is he interested or not just store in the variable
`;

// Build the prompt combining base prompt with recent conversation history and user info
function buildPromptFromConversation() {
  let text = BASE_PROMPT + '\n\n';

  // Include user info if available
  if (name || phone || behavior) {
    text += 'User Information:\n';
    if (name) text += `- Name: ${name}\n`;
    if (phone) text += `- Phone: ${phone}\n`;
    if (behavior) text += `- Behavior: ${behavior}\n`;
  }

  text += '\nConversation:\n';

  // Use last 6 messages to keep prompt size manageable
  const recentConvo = conversation.slice(-6);
  recentConvo.forEach((msg, idx) => {
    if (idx % 2 === 0) {
      text += `User: ${msg}\n`;
    } else {
      text += `AI: ${msg}\n`;
    }
  });

  text += 'AI:'; // Signal to generate next AI reply
  return text;
}

// Function to extract user info from messages
function extractUserInfo(message, aiResponse) {
  // Extract name (e.g., "My name is John" or "I'm John")
  const nameRegex = /(?:my name is |i'm |i am )(\w+)/i;
  const nameMatch = message.match(nameRegex);
  if (nameMatch) name = nameMatch[1];

  // Extract phone number (e.g., "+91 1234567890", "123-456-7890", etc.)
  const phoneRegex = /(\+?\d{1,2}[-.\s]?\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4})/;
  const phoneMatch = message.match(phoneRegex);
  if (phoneMatch) phone = phoneMatch[0];

  // Determine behavior as a natural string
  const lowerMessage = message.toLowerCase();
  const services = [
    'IT Consultancy',
    'Custom Software Development',
    'Web Development',
    'Business Management',
    'E-commerce',
    'Digital Marketing',
    'IT Infrastructure',
    'Data Protection',
    'Customer Support',
    'Cloud Computing',
    'Boozexpress',
    'Cravify',
    'Pharmxpress'
  ];

  // Check for interest or lack thereof
  const matchedServices = services.filter(service => lowerMessage.includes(service.toLowerCase()));
  if (lowerMessage.includes('interested') || lowerMessage.includes('looking for') || lowerMessage.includes('need')) {
    if (matchedServices.length > 0) {
      behavior = `Interested in ${matchedServices.join(' and ')}`;
    } else {
      behavior = 'Interested in general IT solutions';
    }
  } else if (lowerMessage.includes('not interested') || lowerMessage.includes('no thanks')) {
    behavior = 'Not interested';
  } else if (matchedServices.length > 0) {
    // If services are mentioned without explicit interest keywords, assume interest
    behavior = `Interested in ${matchedServices.join(' and ')}`;
  }

  // Check AI response for prompts to collect info
  if (aiResponse.includes('name') && !name) {
    name = null; // Reset if AI is asking for name again
  }
  if (aiResponse.includes('contact number') && !phone) {
    phone = null; // Reset if AI is asking for phone again
  }
}

app.post('/ask', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Please provide a "message" in the request body.' });
  }

  // Add user message to conversation history
  conversation.push(message);

  // Build prompt with conversation context + base Porfyro info
  const promptText = buildPromptFromConversation();

  try {
    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [{ parts: [{ text: promptText }] }],
      },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: GEMINI_API_KEY },
      }
    );

    const answer =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I'm sorry, I couldn't generate an answer at this time. 😔";

    // Extract user info from message and AI response
    extractUserInfo(message, answer);

    // Add AI answer to conversation history
    conversation.push(answer);

    res.json({ answer });
  } catch (error) {
    console.error('Gemini API error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Error occurred while communicating with Gemini API.' });
  }
});

// Endpoint to reset the conversation and user info
app.post('/reset', (req, res) => {
  conversation = [];
  name = null;
  phone = null;
  behavior = null;
  res.json({ message: 'Conversation and user info reset successfully.' });
});

// Simple homepage to verify server is running
app.get('/', (req, res) => {
  res.send('Welcome to Porfyro AI Support! Use POST /ask to chat.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Porfyro AI Support server running on port ${port}`);
});