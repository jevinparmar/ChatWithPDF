// Mock API layer simulating the FastAPI backend with delays and stateful in-memory data

const delay = (ms = Math.floor(Math.random() * 500) + 400) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock state
let currentUser = null;

let mockUsers = [
  {
    id: 'u-1',
    email: 'user@test.com',
    password: 'password123',
    name: 'Alex Johnson',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-09-15T10:00:00Z',
  },
  {
    id: 'u-2',
    email: 'admin@test.com',
    password: 'password123',
    name: 'Sarah Connor (Admin)',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-09-01T08:30:00Z',
  },
];

let mockDocuments = [
  {
    id: 'doc-annual-report',
    name: 'Annual Report 2024.pdf',
    type: 'pdf',
    size: 5242880, // 5.0 MB
    pages: 28,
    status: 'ready',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    summary: 'Detailed research and performance analysis covering neural network architectures, activation function depth, inference latency, and convergence benchmarks.',
    topics: ['Neural Architectures', 'Activation Functions', 'Inference Latency', 'Convergence Rates'],
    suggestedQuestions: [
      'Summarize the section on neural network architecture and its impact on performance.',
      'What activation functions are evaluated in Section 3.1?',
      'How does network depth influence inference latency?'
    ],
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'doc-1',
    name: 'refund_policy_2025.pdf',
    type: 'pdf',
    size: 2457600, // 2.34 MB
    pages: 12,
    status: 'ready', // 'ready' | 'processing' | 'failed'
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    summary: 'Comprehensive guidelines on customer refund procedures, eligibility criteria within 30 days, digital goods exceptions, and automated processing timelines.',
    topics: ['Refund Timelines', 'Digital Goods', 'Chargeback Procedures', 'Exemptions'],
    suggestedQuestions: [
      'What is the standard refund window for physical goods?',
      'Are subscription renewals eligible for prorated refunds?',
      'What happens if a customer initiates a credit card chargeback?'
    ],
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'doc-2',
    name: 'product_architecture_v3.pdf',
    type: 'pdf',
    size: 4890000, // 4.66 MB
    pages: 28,
    status: 'ready',
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    summary: 'Technical architecture specification outlining microservices topology, hybrid vector search with pgvector, and FastAPI async worker queues.',
    topics: ['Microservices', 'Vector Search', 'Async Workers', 'Security'],
    suggestedQuestions: [
      'How does the vector retrieval pipeline handle chunking?',
      'What is the token limit per context window?',
      'Which database is used for storing vector embeddings?'
    ],
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'doc-3',
    name: 'employee_handbook_remote_work.docx',
    type: 'docx',
    size: 1140000, // 1.08 MB
    pages: 18,
    status: 'ready',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    summary: 'Guidelines for remote work stipends, core communication hours (10 AM to 3 PM EST), asynchronous documentation, and home office ergonomics.',
    topics: ['Remote Stipend', 'Core Hours', 'PTO Policy', 'Equipment Allowance'],
    suggestedQuestions: [
      'What are the mandatory core collaboration hours?',
      'How can an employee claim their annual workspace stipend?'
    ]
  },
  {
    id: 'doc-4',
    name: 'security_compliance_audit.txt',
    type: 'txt',
    size: 420000,
    pages: 5,
    status: 'ready',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    summary: 'Annual SOC2 Type II audit checklist and data retention schedules across multi-tenant data pipelines.',
    topics: ['SOC2 Type II', 'Data Retention', 'Encryption at Rest', 'Audit Trails'],
    suggestedQuestions: [
      'What encryption standards are enforced for document storage?',
      'How long are audit trail logs preserved?'
    ]
  }
];

let mockSessions = [
  {
    id: 'session-1',
    title: 'Neural network architecture & performance',
    documentIds: ['doc-annual-report'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'session-2',
    title: 'Refund policy & exceptions',
    documentIds: ['doc-1'],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'session-3',
    title: 'Architecture & Vector Retrieval',
    documentIds: ['doc-2'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

let mockMessages = {
  'session-1': [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Summarize the section on neural network architecture and its impact on performance.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: `Based on the document, neural network architecture significantly influences performance. In Section 3.1, it states:

> "The choice of activation functions and depth plays a critical role in convergence rates and generalization." [Source: Page 4]

Furthermore, the analysis in Section 3.2 details how specific architectures impact latency and accuracy during inference [Source: Page 7].`,
      sources: [
        {
          documentId: 'doc-annual-report',
          fileName: 'Annual Report 2024.pdf',
          page: 4,
          snippet: 'Activation functions define how the weighted sum of input is transformed and the choice of neural network. The choice of activation functions and network depth significantly affects training dynamics and final model accuracy.'
        },
        {
          documentId: 'doc-annual-report',
          fileName: 'Annual Report 2024.pdf',
          page: 7,
          snippet: 'Section 3.2: Architecture profiles indicate latency scaling is bounded by transformer block attention heads.'
        }
      ],
      feedback: null,
      createdAt: new Date(Date.now() - 3600000 * 2 + 10000).toISOString(),
    }
  ],
  'session-2': [
    {
      id: 'msg-201',
      role: 'user',
      content: 'How are documents chunked and embedded in the vector retrieval pipeline?',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'msg-202',
      role: 'assistant',
      content: `The system utilizes **hierarchical recursive character chunking** optimized for semantic continuity:

1. **Chunk Size**: Target token window of 512 tokens with 64 tokens of overlapping context.
2. **Embeddings**: Generated using text-embedding-3-small yielding 1536-dimensional vectors.
3. **Retrieval**: Combined dense vector similarity search with BM25 sparse keyword ranking (reciprocal rank fusion).`,
      sources: [
        {
          documentId: 'doc-2',
          fileName: 'product_architecture_v3.pdf',
          page: 11,
          snippet: 'Chunking Strategy: Recursive splitters prioritize markdown headers and sentence boundaries to avoid splitting factual context across chunk edges.'
        }
      ],
      feedback: null,
      createdAt: new Date(Date.now() - 86400000 * 1 + 8000).toISOString(),
    }
  ],
  'session-3': []
};

let downvotedAnswers = [
  {
    id: 'f-1',
    userEmail: 'devin@example.com',
    question: 'Can contractors claim the home office desk reimbursement?',
    answer: 'Yes, all team members receive the stipend on their first day without restrictions.',
    reason: 'Incorrect information. Contractors are not eligible according to section 3.',
    date: '2026-10-09T14:22:00Z',
    documentName: 'employee_handbook_remote_work.docx'
  },
  {
    id: 'f-2',
    userEmail: 'clara@startup.io',
    question: 'What is the SOC2 retention rule for deleted team accounts?',
    answer: 'Data is completely purged immediately upon deletion.',
    reason: 'Omitted 90-day cold backup audit retention requirement.',
    date: '2026-10-08T11:15:00Z',
    documentName: 'security_compliance_audit.txt'
  }
];

export const mockApi = {
  // Auth
  async login({ email, password }) {
    await delay(600);
    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      const error = new Error('Invalid email or password');
      error.response = { status: 401, data: { message: 'Invalid credentials. Hint: user@test.com / password123 or admin@test.com / password123' } };
      throw error;
    }
    const token = `mock-jwt-token-${user.id}-${Date.now()}`;
    const userData = { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar };
    currentUser = userData;
    return { token, user: userData };
  },

  async signup({ email, password, name }) {
    await delay(700);
    const exists = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      const error = new Error('User already exists');
      error.response = { status: 400, data: { message: 'An account with this email already exists' } };
      throw error;
    }
    const newUser = {
      id: `u-${Date.now()}`,
      email,
      password,
      name: name || email.split('@')[0],
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString()
    };
    mockUsers.push(newUser);
    const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;
    const userData = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, avatar: newUser.avatar };
    currentUser = userData;
    return { token, user: userData };
  },

  async getMe() {
    await delay(300);
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!token) {
      const error = new Error('Unauthorized');
      error.response = { status: 401, data: { message: 'No authentication token found' } };
      throw error;
    }
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      return currentUser;
    }
    return currentUser || mockUsers[0];
  },

  // Documents
  async getDocuments() {
    await delay(450);
    return [...mockDocuments];
  },

  async getDocument(id) {
    await delay(400);
    const doc = mockDocuments.find((d) => d.id === id);
    if (!doc) {
      const err = new Error('Document not found');
      err.response = { status: 404, data: { message: 'Document not found' } };
      throw err;
    }
    return doc;
  },

  async uploadDocument(file) {
    await delay(800);
    const ext = file.name.split('.').pop().toLowerCase();
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type: ext,
      size: file.size,
      pages: Math.floor(Math.random() * 15) + 3,
      status: 'processing',
      createdAt: new Date().toISOString(),
      summary: `Automated analysis for ${file.name}: Ingestion and vector chunking underway.`,
      topics: ['Document Ingestion', 'Semantic Indexing', 'Full-Text Retrieval'],
      suggestedQuestions: [
        `What are the principal sections in ${file.name}?`,
        'Can you summarize the major conclusions?'
      ],
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    };

    mockDocuments.unshift(newDoc);

    // Auto-update to 'ready' after 3.5 seconds
    setTimeout(() => {
      const index = mockDocuments.findIndex((d) => d.id === newDoc.id);
      if (index !== -1) {
        mockDocuments[index].status = 'ready';
        mockDocuments[index].summary = `Extracted and indexed document containing ${mockDocuments[index].pages} pages with semantic embeddings ready for retrieval.`;
      }
    }, 3500);

    return newDoc;
  },

  async deleteDocument(id) {
    await delay(500);
    mockDocuments = mockDocuments.filter((d) => d.id !== id);
    return { success: true, message: 'Document deleted successfully' };
  },

  // Chat sessions
  async getSessions() {
    await delay(350);
    return [...mockSessions].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  },

  async createSession({ title = 'New conversation', documentIds = [] }) {
    await delay(400);
    const newSession = {
      id: `session-${Date.now()}`,
      title,
      documentIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockSessions.unshift(newSession);
    mockMessages[newSession.id] = [];
    return newSession;
  },

  async deleteSession(id) {
    await delay(400);
    mockSessions = mockSessions.filter((s) => s.id !== id);
    delete mockMessages[id];
    return { success: true };
  },

  async renameSession(id, title) {
    await delay(300);
    const session = mockSessions.find((s) => s.id === id);
    if (session) {
      session.title = title;
      session.updatedAt = new Date().toISOString();
    }
    return session;
  },

  // Messages
  async getMessages(sessionId) {
    await delay(400);
    return mockMessages[sessionId] || [];
  },

  async sendMessage({ sessionId, question, documentIds = [] }) {
    await delay(800);
    
    // Create user message
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };

    if (!mockMessages[sessionId]) {
      mockMessages[sessionId] = [];
    }
    mockMessages[sessionId].push(userMsg);

    // Select referenced document or default
    const refDocId = documentIds[0] || (mockDocuments[0] ? mockDocuments[0].id : 'doc-1');
    const doc = mockDocuments.find((d) => d.id === refDocId) || mockDocuments[0];
    const pageNum = Math.floor(Math.random() * (doc ? doc.pages : 8)) + 1;

    // Build intelligent mock answer
    const answerContent = `Based on **${doc ? doc.name : 'the attached documents'}**, here is what the text specifies regarding your question:

1. **Context & Findings**:
   The provisions in Section ${pageNum}.3 state that all registered entries and queries are evaluated against standard organizational protocols.
2. **Actionable Details**:
   - Verification procedures require corresponding identifier proofs.
   - Any modifications must be confirmed within 14 business days.
   - Escalated inquiries route to Tier 2 support teams automatically.

> *"Direct excerpt: Referenced records confirm that compliance guidelines outlined on page ${pageNum} remain active and binding for all current account holders."*`;

    const sources = [
      {
        documentId: doc ? doc.id : 'doc-1',
        fileName: doc ? doc.name : 'refund_policy_2025.pdf',
        page: pageNum,
        snippet: `Page ${pageNum}, Paragraph 2: Operational terms explicitly dictate standard resolution procedures under Section ${pageNum}.3. Supporting documentation is preserved for internal audit verification.`
      }
    ];

    if (doc && doc.pages > 3) {
      sources.push({
        documentId: doc.id,
        fileName: doc.name,
        page: Math.max(1, pageNum - 1),
        snippet: `Section ${pageNum - 1}.B: Additional references clarify standard turnaround commitments and communication SLAs.`
      });
    }

    const aiMsg = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: answerContent,
      sources,
      feedback: null,
      createdAt: new Date().toISOString(),
    };

    mockMessages[sessionId].push(aiMsg);

    // Update session timestamp & auto-name title if initial message
    const session = mockSessions.find((s) => s.id === sessionId);
    if (session) {
      session.updatedAt = new Date().toISOString();
      if (session.title === 'New conversation' || session.title.startsWith('New chat')) {
        session.title = question.slice(0, 32) + (question.length > 32 ? '...' : '');
      }
    }

    return {
      answer: answerContent,
      sources,
      userMessage: userMsg,
      assistantMessage: aiMsg,
    };
  },

  // Simulated SSE stream
  streamMessage({ sessionId, question, documentIds = [], onToken, onDone, onError }) {
    let cancelled = false;

    (async () => {
      try {
        await delay(500);
        if (cancelled) return;

        const refDocId = documentIds[0] || (mockDocuments[0] ? mockDocuments[0].id : 'doc-1');
        const doc = mockDocuments.find((d) => d.id === refDocId) || mockDocuments[0];
        const pageNum = Math.floor(Math.random() * (doc ? doc.pages : 8)) + 1;

        const fullResponse = `Based on **${doc ? doc.name : 'the attached documents'}**, here is the verified answer:

### Summary of Findings
The requested information is directly addressed in Section ${pageNum} of **${doc ? doc.name : 'the policy'}**.

- **Key Directive**: All associated requirements are monitored continuously.
- **Verification Window**: Standard evaluation occurs within **3 to 5 business days**.
- **Exceptions**: Specific clauses apply for expedited processing if pre-approved by the department lead.

> *"Excerpt: Page ${pageNum} explicitly states that operational compliance is validated through encrypted logs and documented approval workflows."*

If you need further details regarding specific edge cases or exclusions, please let me know!`;

        const sources = [
          {
            documentId: doc ? doc.id : 'doc-1',
            fileName: doc ? doc.name : 'refund_policy_2025.pdf',
            page: pageNum,
            snippet: `Page ${pageNum}: Operational terms explicitly dictate standard resolution procedures under Section ${pageNum}.3. Supporting documentation is preserved for internal audit verification.`
          },
          {
            documentId: doc ? doc.id : 'doc-1',
            fileName: doc ? doc.name : 'refund_policy_2025.pdf',
            page: Math.max(1, pageNum - 1),
            snippet: `Section ${pageNum - 1}.B: Additional provisions establish SLA targets and escalation procedures.`
          }
        ];

        // Tokenize by word + space
        const words = fullResponse.split(' ');
        let accumulated = '';

        for (let i = 0; i < words.length; i++) {
          if (cancelled) return;
          const word = (i === 0 ? '' : ' ') + words[i];
          accumulated += word;
          onToken(word, accumulated);
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 25) + 20));
        }

        // Add to mock storage
        const userMsg = {
          id: `msg-${Date.now() - 100}`,
          role: 'user',
          content: question,
          createdAt: new Date().toISOString(),
        };
        const aiMsg = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
          sources,
          feedback: null,
          createdAt: new Date().toISOString(),
        };

        if (!mockMessages[sessionId]) {
          mockMessages[sessionId] = [];
        }
        mockMessages[sessionId].push(userMsg);
        mockMessages[sessionId].push(aiMsg);

        const session = mockSessions.find((s) => s.id === sessionId);
        if (session) {
          session.updatedAt = new Date().toISOString();
          if (session.title === 'New conversation' || session.title.startsWith('New chat')) {
            session.title = question.slice(0, 32) + (question.length > 32 ? '...' : '');
          }
        }

        onDone({
          answer: accumulated,
          sources,
          userMessage: userMsg,
          assistantMessage: aiMsg,
        });
      } catch (err) {
        if (!cancelled && onError) onError(err);
      }
    })();

    return () => {
      cancelled = true;
    };
  },

  async submitFeedback(messageId, rating) {
    await delay(300);
    // Locate message in any session
    for (const sId in mockMessages) {
      const msg = mockMessages[sId].find((m) => m.id === messageId);
      if (msg) {
        msg.feedback = rating;
        break;
      }
    }
    return { success: true };
  },

  async getAdminStats() {
    await delay(500);
    return {
      totalUsers: 1420,
      totalDocuments: 3842,
      totalQuestions: 29540,
      satisfactionRate: 94.6,
      questionsPerDay: [
        { date: 'Mon', questions: 1240 },
        { date: 'Tue', questions: 1890 },
        { date: 'Wed', questions: 2390 },
        { date: 'Thu', questions: 2180 },
        { date: 'Fri', questions: 2890 },
        { date: 'Sat', questions: 1650 },
        { date: 'Sun', questions: 1420 },
      ],
      feedbackBreakdown: [
        { name: 'Positive (Thumbs Up)', value: 890, color: '#10B981' },
        { name: 'Negative (Thumbs Down)', value: 54, color: '#EF4444' },
        { name: 'Unrated', value: 310, color: '#9CA3AF' },
      ],
      recentUsers: [
        { id: 'u-1', name: 'Alex Johnson', email: 'user@test.com', documents: 8, questions: 42, role: 'user', joined: '2026-09-15' },
        { id: 'u-2', name: 'Sarah Connor', email: 'admin@test.com', documents: 14, questions: 112, role: 'admin', joined: '2026-09-01' },
        { id: 'u-3', name: 'Marcus Sterling', email: 'marcus@acme.corp', documents: 22, questions: 184, role: 'user', joined: '2026-10-02' },
        { id: 'u-4', name: 'Elena Rostova', email: 'elena@biotech.org', documents: 5, questions: 29, role: 'user', joined: '2026-10-05' },
        { id: 'u-5', name: 'Devon Miles', email: 'devon@foundation.net', documents: 11, questions: 67, role: 'user', joined: '2026-10-08' },
      ],
      downvotedAnswers: downvotedAnswers
    };
  }
};
