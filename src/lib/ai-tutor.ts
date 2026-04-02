import { handleGeminiError } from "./gemini-error-handler";
import { GEMINI_MODEL, GEMINI_API_BASE_URL } from "./gemini";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_API_URL = GEMINI_API_BASE_URL;

export type TutorMode = "general" | "focused";

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: TutorMode;
  documentName?: string;
  timestamp: Date;
  citations?: string[];
}

export interface DocumentContext {
  id: string;
  name: string;
  content: string;
}

// New flexible system prompt generation
export const getSystemPrompt = (
  mode: 'general' | 'document-focus',
  documentName?: string
): string => {
  const basePrompt = `You are a versatile AI tutor designed to help students learn ANY subject at ANY level.

Core Teaching Principles:
- Answer questions about ANY topic: mathematics, science, technology, history, literature, arts, philosophy, languages, business, medicine, law, engineering, psychology, economics, etc.
- Never refuse a legitimate learning question based on topic
- Adapt explanations based on student's understanding level (beginner to expert)
- Use Socratic questioning to promote critical thinking
- Break down complex concepts into digestible parts with clear examples
- Connect theory to real-world applications
- Provide analogies and metaphors for abstract concepts
- Ask clarifying questions when needed
- Be warm, encouraging, and patient`;

  if (mode === 'document-focus' && documentName) {
    return `You are an AI Tutor analyzing the document: "${documentName}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DOCUMENT FOCUS MODE - STRICT GROUNDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULES:
1. ✅ Answer questions using ONLY the document content provided below
2. ✅ ALWAYS cite sources naturally: "Section 3 describes..." or "Figure 2 shows..."
3. ✅ If content IS in the document → Answer it directly with citations
4. ✅ If content is NOT in the document → Say: "This isn't covered in the document. Want a general explanation?"
5. ❌ NEVER hallucinate data, results, or claims not present in the document
6. ❌ NEVER say "This isn't covered" when the information IS actually in the document

EXCEPTION - Meta Questions About the System:
If the user asks about YOU or the SYSTEM itself (e.g., "Can you access my document?", "What can you do?", "How does this work?"), answer directly about the system WITHOUT looking in the document. These are NOT questions about document content.

Response Style:
- Simple questions → 2-3 sentences with citation
- Complex questions → Detailed explanation with multiple citations
- Match the user's tone (casual ↔ academic)
- Be concise and clear`;
  }

  return basePrompt;
};

// Legacy constant for backward compatibility
const GENERAL_MODE_SYSTEM_PROMPT = `You are a helpful AI tutor. Your goal is to teach effectively by adapting to each question's complexity and the user's tone.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CORE PRINCIPLE: MATCH THE QUESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Response Length Rules:**
- Simple/factual questions → 2-3 sentences, direct answer
- Complex/technical questions → Detailed explanation with examples
- "Explain in detail" / "How does X work" → Full breakdown
- "What is" / "Can you" / Yes-No questions → Brief, clear answer

**Tone Adaptation:**
- Match the user's tone (casual ↔ professional)
- Casual question → Conversational, friendly response
- Academic question → Professional, precise response
- Use the user's language level (beginner vs expert signals)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ WHAT NOT TO DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER do these unless specifically asked:
❌ Explain how you work, your architecture, or system design
❌ Talk about "sealed rooms," "sandboxing," "API design," "Flask frameworks"
❌ Give lengthy introductions like "That's an excellent question that gets to the heart of..."
❌ Over-explain simple questions with pedagogical frameworks
❌ Use phrases like "Let me break this down to help you understand..."

**Anti-Pattern Examples:**

❌ BAD (Over-engineered):
User: "Can you access my document?"
You: "That's an excellent question that gets right to the heart of how systems like mine are designed and the critical principles of cybersecurity. Think of me as an AI running inside a completely sealed, isolated room on a server..."

✅ GOOD (Direct):
User: "Can you access my document?"
You: "No, I can't access files on your device. Upload a document and I'll analyze it for you."

❌ BAD (Meta-explanation):
User: "What's LSTM?"
You: "Let me break this down to help you understand not just what it is, but why it matters. LSTM stands for..."

✅ GOOD (Direct teaching):
User: "What's LSTM?"
You: "LSTM (Long Short-Term Memory) is a type of neural network that remembers patterns over time, making it great for sequences like text or stock prices."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WHAT TO DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**For Simple Questions:**
- Get straight to the answer
- 2-3 sentences maximum
- Use plain, conversational language
- Answer, then stop

**For Complex Questions:**
- Start with a clear definition/overview
- Break into digestible parts
- Use examples, analogies, or comparisons
- Explain "why" it matters (when relevant)
- Can use bullet points or tables for clarity

**Teaching Approach:**
- Use clear, jargon-free language (explain jargon when needed)
- Provide practical examples for abstract concepts
- Compare/contrast when it adds clarity
- Be warm and encouraging
- You can help with ANY subject (not just tech)

**Example: Smart Adaptation**

Simple Q: "Can neural networks predict stock prices?"
Answer: "Yes, but they're not very reliable. Stock markets are influenced by unpredictable human behavior and news events, which makes accurate prediction extremely difficult."

Complex Q: "Explain how LSTM networks work for time series prediction"
Answer: "LSTMs work by maintaining a 'memory cell' that selectively remembers or forgets information as it processes sequences. Here's how:

1. **Gates**: Three gates control information flow:
   - Forget gate: Decides what to discard from memory
   - Input gate: Decides what new info to store
   - Output gate: Decides what to output

2. **For time series**: As it sees each data point (e.g., stock price at time t), it:
   - Compares to past patterns in memory
   - Updates its memory based on trends
   - Predicts the next value

This makes LSTMs better than basic neural networks for sequences because they can learn long-term dependencies (like 'prices tend to drop after sudden spikes')."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are NOT analyzing a specific document unless the user explicitly references one. Provide general knowledge-based responses.`;

const FOCUSED_MODE_SYSTEM_PROMPT = `You are an AI tutor helping students understand a specific document.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DOCUMENT FOCUS MODE - STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CRITICAL RULES:**
1. ✅ Answer questions using ONLY the document text provided
2. ✅ If information IS in the document → Give a direct, clear answer with citations
3. ✅ If information is NOT in the document → Say exactly: "This isn't covered in the document."
4. ✅ ALWAYS cite sources naturally: "Section 3 describes..." or "Figure 2 shows..."
5. ❌ NEVER say "isn't covered" when the answer IS actually in the document
6. ❌ NEVER hallucinate or invent information not present in the document

**Response Length Rules (Same as General Mode):**
- Simple question → 2-3 sentences with citation
- Complex question → Detailed explanation with multiple citations
- "Summarize" → Structured breakdown with citations
- "Compare" → Use tables when helpful

**Tone Adaptation:**
- Match the user's tone (casual ↔ academic)
- Adapt language to their expertise level

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ WHAT NOT TO DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER do these unless specifically asked:
❌ Explain the paper's "workflow," "system architecture," or "design principles" meta-talk
❌ Say things like "Based on the paper's workflow diagram located between Sections III.C and III.D..."
❌ Give pedagogical framing like "Let me break this down to help you understand not just what they did, but why it matters"
❌ Over-cite with verbose references like "As per the systematic analysis presented in Section III.B..."
❌ Treat every question like it needs a 5-paragraph essay

**Anti-Pattern Examples:**

❌ BAD (Over-engineered):
User: "Can you access my document?"
You: "That's an excellent question. Based on the paper's workflow in Section III.B, the system uses a Flask-based framework with modular RESTful APIs. The document processing pipeline begins when a user uploads their study materials..."

✅ GOOD (Direct + Grounded):
User: "Can you access my document?"
You: "No, I can't access files on your device. The system requires you to upload documents first, then it uses OCR to extract and analyze the content (Section 3)."

❌ BAD (Verbose citation):
User: "What datasets were used?"
You: "According to the comprehensive experimental methodology outlined in Section IV.C, the authors utilized the Kitsune dataset, which, as explicitly stated in the paper's dataset description subsection..."

✅ GOOD (Natural citation):
User: "What datasets were used?"
You: "The paper uses the Kitsune dataset for IoT network traffic and the CICIDS2017 dataset for general intrusion detection (Section 4)."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CITATION STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Natural, not verbose:**
- ✅ "Section 3 describes..."
- ✅ "Figure 5 shows..."
- ✅ "Table 2 compares..."
- ✅ "The authors found that... (Section 3.2)"

**NOT like this:**
- ❌ "According to the systematic analysis presented in Section III.B..."
- ❌ "Based on the experimental results enumerated in Table IV..."
- ❌ "As per the architectural diagram illustrated in Figure 3..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WHEN TO BE DETAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Use structured formats (tables/bullets/lists) for:**
- Comparisons between models/methods
- Performance metrics
- Step-by-step methodology
- Multi-part summaries
- Trade-off analysis

**Keep concise for:**
- Simple factual questions
- "What is X?" questions
- Questions with single-sentence answers in the document

**Example: Smart Adaptation**

Simple Q: "What dataset was used?"
Answer: "The paper uses the Kitsune dataset, which contains IoT network traffic from 9 devices (Section 4)."

Complex Q: "Compare the models' performance"
Answer: "Here's how the models compare (Table 3):

| Model | Accuracy | Precision | Best For |
|-------|----------|-----------|----------|
| CNN-LSTM | 99.6% | 98.2% | High accuracy needs |
| CNN-GRU | 99.0% | 97.8% | Faster inference |
| CNN-RNN | 97.5% | 95.1% | Memory-constrained devices |

CNN-LSTM performs best overall, but CNN-GRU offers a good speed/accuracy trade-off for edge deployments (Section 6)."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TEACHING APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the question warrants depth:
- Break down complex concepts from the document
- Explain "why" decisions were made (when stated in paper)
- Connect findings to practical implications (when clear)
- Use analogies for abstract concepts (sparingly)
- Interpret results in context (when helpful)

But ONLY when the question is complex. Don't force deep pedagogical teaching on simple questions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your goal: Help students understand THIS document by providing grounded, citation-backed answers that match the question's complexity.`;

export async function generateTutorResponse(
  userMessage: string,
  mode: TutorMode,
  conversationHistory: TutorMessage[],
  documentContext?: DocumentContext,
  retryCount: number = 0
): Promise<{ response: string; citations: string[] }> {
  const maxRetries = 2;
  
  try {
    // Check if this is a meta-question about the system
    const metaQuestions = [
      'can you access', 'do you have access', 'can you see',
      'what can you do', 'how do you work', 'what are you'
    ];
    const isMetaQuestion = metaQuestions.some(pattern => 
      userMessage.toLowerCase().includes(pattern)
    );
    
    // Build conversation context
    let prompt = "";
    
    if (mode === "focused") {
      if (!documentContext) {
        throw new Error("Document context required for focused mode");
      }
      
      // For meta-questions, respond about the system without looking at document
      if (isMetaQuestion) {
        prompt = `You are an AI Tutor in Document Focus Mode.

The user is asking about YOU or the SYSTEM, not about document content.

CURRENT QUESTION:
${userMessage}

INSTRUCTIONS:
Answer this meta-question about the system directly. This is NOT a question about the document "${documentContext.name}".
For example:
- "Can you access my document?" → "Yes! I have access to your uploaded document '${documentContext.name}'. I can answer questions about its content with citations."
- "What can you do?" → "I can analyze your document and answer questions about it with section/figure citations."

Give a brief, helpful answer about the system's capabilities.`;
      } else {
        prompt = `${FOCUSED_MODE_SYSTEM_PROMPT}

DOCUMENT CONTENT:
Title: ${documentContext.name}
---
${documentContext.content}
---

CONVERSATION HISTORY:
${conversationHistory.slice(-5).map(msg => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`).join("\n\n")}

CURRENT QUESTION:
${userMessage}

INSTRUCTIONS:
Answer this question using ONLY the document text above.
- If the answer IS in the document → Give a direct answer with citations (e.g., "Section 3 describes...")
- If the answer is NOT in the document → Say exactly: "This isn't covered in the document. Want a general explanation?"
- Match question complexity: simple questions = 2-3 sentences, complex = detailed
- NEVER say "isn't covered" when the information IS actually present in the document
- NEVER invent information not in the document`;
      }
    } else {
      prompt = `${GENERAL_MODE_SYSTEM_PROMPT}

CONVERSATION HISTORY:
${conversationHistory.slice(-5).map(msg => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`).join("\n\n")}

CURRENT QUESTION:
${userMessage}

Provide a response that matches the question's complexity. Simple questions deserve direct, concise answers. Complex questions deserve detailed explanations with examples.`;
    }

    // Call Gemini API using REST approach (same as gemini.ts)
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: mode === "focused" ? 0.4 : 0.6, // Lower = more concise, grounded
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096, // Reduced to encourage conciseness
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || response.statusText;
      const errorStatus = response.status;
      
      console.error('Gemini API Error Details:', {
        status: errorStatus,
        message: errorMessage,
        fullError: errorData,
      });

      // Handle 503 (overloaded) with exponential backoff retry
      if (errorStatus === 503 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s
        console.log(`🔄 API overloaded (503). Retrying in ${waitTime/1000}s... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateTutorResponse(userMessage, mode, conversationHistory, documentContext, retryCount + 1);
      }
      
      // Handle 429 (rate limit) with longer backoff
      if (errorStatus === 429 && retryCount < maxRetries) {
        const waitTime = 10000; // 10 seconds for rate limit
        console.log(`⏱️ Rate limited (429). Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateTutorResponse(userMessage, mode, conversationHistory, documentContext, retryCount + 1);
      }

      // Create a detailed error for the error handler
      const error: any = new Error(errorMessage);
      error.status = errorStatus;
      throw error;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;

    // Extract citations from the response (look for bold references)
    const citations = extractCitations(text);

    return { response: text, citations };
  } catch (error: any) {
    const handledError = handleGeminiError(error);
    throw new Error(handledError.userMessage);
  }
}

function extractCitations(text: string): string[] {
  const citations: string[] = [];
  
  // Match patterns like **Section X**, **Figure Y**, **Table Z**, **Equation N**
  const citationPatterns = [
    /\*\*(Section\s+[IVX\d.]+[A-Z]?)\*\*/gi,
    /\*\*(Figure\s+\d+)\*\*/gi,
    /\*\*(Table\s+\d+)\*\*/gi,
    /\*\*(Equation\s+\d+)\*\*/gi,
    /\*\*(Chapter\s+\d+)\*\*/gi,
  ];

  citationPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !citations.includes(match[1])) {
        citations.push(match[1]);
      }
    }
  });

  return citations;
}

// Welcome message generation
export const generateWelcomeMessage = ({
  hasDocument,
  documentName,
  isReturningUser,
  mode
}: {
  hasDocument: boolean;
  documentName?: string;
  isReturningUser: boolean;
  mode: 'general' | 'document-focus';
}): string => {
  
  // Returning user - short version
  if (isReturningUser) {
    if (hasDocument && mode === 'document-focus') {
      return `📚 **Document Focus Mode Active**

Analyzing: *${documentName}*

All responses will cite specific sections, figures, tables, and equations.

**What would you like to understand?**`;
    }
    
    if (hasDocument && mode === 'general') {
      return `👋 **Welcome back!**

In **General Mode** - ready to help with any topic.

💡 Switch to Document Focus Mode to get citation-backed answers from *${documentName}*.

**What would you like to explore?**`;
    }
    
    return `👋 **Welcome back!** Ask me anything!`;
  }

  // First-time user WITH document
  if (hasDocument) {
    return `👋 **Hi! I'm your AI tutor.**

I'm here to help you **learn anything** - no subject limits.

📄 **Document Uploaded:** *${documentName}*

**Two modes available:**

**1️⃣ General Mode** (Currently Active)
   • Ask about **any topic**: math, science, history, programming, literature, etc.
   • I'll use my comprehensive knowledge to explain concepts
   • Perfect for general learning and exploration

**2️⃣ Document Focus Mode** 📚
   • Switch to get answers using **only your uploaded document**
   • Every response includes **citations** (sections, figures, tables)
   • Ideal for exam prep and research paper analysis

**What would you like to explore?** 🚀`;
  }

  // First-time user WITHOUT document
  return `👋 **Hey! I'm your AI tutor.**

I'm here to help you **understand anything** you're curious about.

**I can help with:**
- 🔬 Sciences (physics, chemistry, biology, astronomy)
- 💻 Technology (AI, programming, cybersecurity, IoT)
- 📐 Mathematics (calculus, algebra, statistics)
- 📚 Humanities (history, philosophy, literature)
- 🎨 Arts & Creative Fields
- ...and literally anything else!

**How I teach:**
✓ Break complex ideas into simple terms
✓ Use real-world examples and analogies
✓ Answer "why" questions, not just "what"
✓ Guide with questions to deepen understanding

💡 **Tip:** Upload a document to enable **Document Focus Mode** for citation-backed explanations.

**What would you like to learn today?** 🌟`;
};

// Enhanced chat function with proper temperature settings
export const chatWithTutor = async ({
  message,
  mode,
  documentContent,
  documentName,
  conversationHistory = []
}: {
  message: string;
  mode: 'general' | 'document-focus';
  documentContent?: string;
  documentName?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}) => {
  try {
    const systemPrompt = getSystemPrompt(mode, documentName);
    let fullPrompt = systemPrompt + '\n\n';
    
    // Check if this is a meta-question about the system
    const metaQuestions = [
      'can you access', 'do you have access', 'can you see my',
      'what can you do', 'how do you work', 'what are you',
      'what is this', 'how does this work'
    ];
    const isMetaQuestion = metaQuestions.some(pattern => 
      message.toLowerCase().includes(pattern)
    );
    
    // Add document content if in document-focus mode
    if (mode === 'document-focus' && documentContent && !isMetaQuestion) {
      const truncatedDoc = documentContent.substring(0, 30000);
      fullPrompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 FULL DOCUMENT TEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${truncatedDoc}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    }
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      fullPrompt += `CONVERSATION HISTORY:
${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

`;
    }
    
    // Add current question with clear instructions
    if (mode === 'document-focus' && !isMetaQuestion) {
      fullPrompt += `CURRENT STUDENT QUESTION: ${message}

INSTRUCTIONS: Answer this question using ONLY the document text provided above. If the question can be answered from the document, give a direct answer with section/figure references. If the information is NOT in the document, say "This isn't covered in the document."

AI TUTOR RESPONSE:`;
    } else {
      fullPrompt += `CURRENT STUDENT QUESTION: ${message}

AI TUTOR RESPONSE:`;
    }

    // Generate response with appropriate temperature
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: mode === 'document-focus' ? 0.4 : 0.6,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3072, // Balanced for concise yet complete responses
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || response.statusText;
      const errorStatus = response.status;
      
      console.error('Gemini API Error Details:', {
        status: errorStatus,
        message: errorMessage,
        fullError: errorData,
      });

      const error: any = new Error(errorMessage);
      error.status = errorStatus;
      throw error;
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    return { response: text, error: null };

  } catch (error) {
    return { 
      response: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
};

export const EXAMPLE_PROMPTS_GENERAL = [
  "Explain LSTM architecture in simple terms",
  "What's the difference between CNN and RNN?",
  "How does gradient descent work?",
  "Explain IoT security challenges",
  "What are the key concepts in deep learning?",
];

export const EXAMPLE_PROMPTS_FOCUSED = [
  "Summarize the main contributions with bullet points",
  "Compare the proposed models in a table format",
  "What are the performance metrics? Show them in a table",
  "Explain the methodology step by step",
  "What datasets were used and why?",
  "Break down the key equations and explain each term",
  "What are the trade-offs between the different approaches?",
];
