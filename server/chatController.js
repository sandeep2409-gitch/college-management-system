const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();


const STATIC_FAQS = [
  {
    keywords: ["study material", "notes", "syllabus", "resources", "books"],
    response: "You can find all study materials, notes, and the syllabus in the **Resources** section. \n\nDirect link: **/resources**"
  },
  {
    keywords: ["feedback", "faculty", "professor", "rating", "teacher"],
    response: "To provide feedback for your faculty, please visit the **Faculty Feedback** portal. It is completely anonymous. \n\nDirect link: **/feedback**"
  },
  {
    keywords: ["attendance", "present", "absent", "track"],
    response: "You can track your daily attendance and see your percentage in the **Attendance** module. \n\nDirect link: **/attendance**"
  },
  {
    keywords: ["complaint", "grievance", "issue", "problem", "complain"],
    response: "If you have any issues or complaints, you can file them anonymously in the **Grievance** section. \n\nDirect link: **/complaints**"
  },
  {
    keywords: ["event", "calendar", "holiday", "exam", "schedule"],
    response: "Stay updated with college events and exam schedules using our **Event Calendar**. \n\nDirect link: **/calendar**"
  }
];

const handleChat = async (req, res, db) => {
  const { message, history, userContext } = req.body;
  const lowerMessage = message.toLowerCase();
  const userName = userContext?.name || "there";
  const userRole = userContext?.role || "guest";

  console.log(`[Chat] Incoming query from ${userName} (${userRole}): "${message}"`);


  const getSystemStats = () => {
    return new Promise((resolve) => {
      if (!db) return resolve({ studentCount: "N/A", resourceCount: "N/A", pendingComplaints: "N/A" });
      db.get(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'student') as studentCount,
          (SELECT COUNT(*) FROM resources) as resourceCount,
          (SELECT COUNT(*) FROM complaints WHERE status = 'pending') as pendingComplaints
        FROM users LIMIT 1
      `, (err, row) => {
        resolve(row || { studentCount: 0, resourceCount: 0, pendingComplaints: 0 });
      });
    });
  };


  if (lowerMessage.match(/\b(hi|hello|hey|hola)\b/)) {
    return res.json({
      message: `Hello ${userName}! I'm the **College 360 Logic Core**. How can I help you navigate the system today?`
    });
  }


  if (lowerMessage.includes("how many") || lowerMessage.includes("stats") || lowerMessage.includes("count") || lowerMessage.includes("status")) {
    const stats = await getSystemStats();

    if (lowerMessage.includes("student")) {
      return res.json({ message: `There are currently **${stats.studentCount} students** registered in our digital campus registry.` });
    }
    if (lowerMessage.includes("resource") || lowerMessage.includes("material") || lowerMessage.includes("note")) {
      return res.json({ message: `I've found **${stats.resourceCount} academic assets** (notes, syllabus, materials) available in the library.` });
    }
    if (lowerMessage.includes("complaint") || lowerMessage.includes("issue") || lowerMessage.includes("grievance")) {
      return res.json({ message: `The administration currently has **${stats.pendingComplaints} pending grievances** under review.` });
    }
  }


  const navMap = {
    "attendance": "/attendance",
    "resource": "/resources",
    "material": "/resources",
    "notes": "/resources",
    "syllabus": "/resources",
    "feedback": "/feedback",
    "complaint": "/complaints",
    "grievance": "/complaints",
    "event": "/calendar",
    "calendar": "/calendar",
    "student": "/manage-students",
    "dashboard": "/dashboard"
  };

  for (const [key, path] of Object.entries(navMap)) {
    if (lowerMessage.includes(key)) {
      if (key === "student" && userRole !== "admin") continue;
      return res.json({
        message: `I can help you with that. Visit the **${key.charAt(0).toUpperCase() + key.slice(1)}** module here: \n\nDirect Link: **${path}**`
      });
    }
  }


  for (const faq of STATIC_FAQS) {
    if (faq.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return res.json({ message: faq.response });
    }
  }


  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here' && !apiKey.startsWith('MOCK')) {
    try {
      const stats = await getSystemStats();
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are the College 360 AI. User: ${userName}. 
        Direct links: /attendance, /resources, /outpass, /visitors, /feedback, /complaints.
        Tone: Professional, very concise, no emojis.`
      });

      const chat = model.startChat({
        history: (history || []).map(h => ({
          role: h.role === 'bot' ? 'model' : h.role,
          parts: [{ text: h.parts[0].text }]
        })),
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return res.json({ message: response.text() });
    } catch (error) {
      console.error("[Chat] Gemini Fallback Error:", error.message);
    }
  }


  res.json({
    message: "I couldn't find a direct link for that. Try asking about **Attendance**, **Time Table**, or **Resources**."
  });
};

module.exports = { handleChat };
