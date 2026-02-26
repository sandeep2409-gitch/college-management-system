const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
// bcrypt removed for plain text storage
const jwt = require("jsonwebtoken");

const chatbot = require("./chatController");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123";

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// File Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads/")) fs.mkdirSync("uploads/");
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Database Initialization
const dbPath = path.resolve(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      studentId TEXT UNIQUE,
      faceDescriptor TEXT
    )`);

    // Attendance Table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      date TEXT,
      status TEXT,
      verified INTEGER DEFAULT 1,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Resources Table
    db.run(
      "CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, category TEXT, fileUrl TEXT, uploadedBy INTEGER, status TEXT DEFAULT 'pending')",
    );

    // Feedback & Complaints
    db.run(
      "CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, facultyName TEXT, rating INTEGER, comment TEXT, submittedBy INTEGER)",
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS complaints (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, status TEXT DEFAULT 'pending', submittedBy INTEGER)",
    );

    // Visitors Table
    db.run(`CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      purpose TEXT NOT NULL,
      visitDate TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      entryTime TEXT,
      exitTime TEXT
    )`);

    // Out Pass Table
    db.run(`CREATE TABLE IF NOT EXISTS out_pass (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      studentName TEXT NOT NULL,
      reason TEXT NOT NULL,
      destination TEXT NOT NULL,
      departureDate TEXT NOT NULL,
      returnDate TEXT,
      status TEXT DEFAULT 'pending',
      requestTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(studentId) REFERENCES users(id)
    )`);

    // Events
    db.run(
      "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, date TEXT NOT NULL, location TEXT, description TEXT, type TEXT)",
    );

    // TimeTable Table
    db.run(
      "CREATE TABLE IF NOT EXISTS timetable (className TEXT PRIMARY KEY, data TEXT)",
    );

    // System Admin (Default)
    const adminEmail = "admin@college.edu";
    db.get(
      "SELECT * FROM users WHERE email = ?",
      [adminEmail],
      async (err, row) => {
        if (!row) {
          const hashedPassword = "admin123";
          db.run(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            ["System Admin", adminEmail, hashedPassword, "admin"],
          );
        }
      },
    );

    // Run Migrations for missing columns if any (Safety check)
    db.all("PRAGMA table_info(resources)", (err, columns) => {
      if (!err && !columns.some((col) => col.name === "status")) {
        db.run(
          "ALTER TABLE resources ADD COLUMN status TEXT DEFAULT 'pending'",
        );
      }
    });

    db.all("PRAGMA table_info(timetable)", (err, columns) => {
      if (
        !err &&
        columns.length > 0 &&
        !columns.some((col) => col.pk === 1 && col.name === "className")
      ) {
        // If the table exists but does not have className as PRIMARY KEY, let's fix it by recreating.
        // It's a small table, so dropping and recreating is okay in this context.
        db.serialize(() => {
          db.run("DROP TABLE IF EXISTS timetable_old");
          db.run("ALTER TABLE timetable RENAME TO timetable_old");
          db.run(
            "CREATE TABLE timetable (className TEXT PRIMARY KEY, data TEXT)",
          );
          // Try to migrate data if possible
          db.run(
            "INSERT OR IGNORE INTO timetable (className, data) SELECT className, data FROM timetable_old WHERE className IS NOT NULL",
          );
          db.run("DROP TABLE timetable_old");
        });
      }
    });

    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (!err && !columns.some((col) => col.name === "studentId")) {
        db.run("ALTER TABLE users ADD COLUMN studentId TEXT UNIQUE");
      }
    });
  });
}

// --- API Routes ---

app.get("/", (req, res) => {
  res.send("College Management System API is running securely.");
});

// Authentication
app.post("/api/register", async (req, res) => {
  const { name, email, password, role, studentId } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required" });
  }

  try {
    const hashedPassword = password;
    db.run(
      "INSERT INTO users (name, email, password, role, studentId) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role || "student", studentId || null],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            const field = err.message.includes("email")
              ? "Email"
              : "Student ID";
            return res.status(400).json({ error: `${field} already exists` });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: "User registered successfully",
          user: {
            id: this.lastID,
            name,
            email,
            role: role || "student",
            studentId,
          },
        });
      },
    );
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal server error during registration" });
  }
});

app.post("/api/login", (req, res) => {
  const { identifier, password, role } = req.body;

  db.get(
    "SELECT * FROM users WHERE (email = ? OR studentId = ?) AND role = ?",
    [identifier, identifier, role],
    async (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ error: "User not found" });

      const isMatch = (password === user.password);
      if (!isMatch)
        return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
        },
      });
    },
  );
});

// Resources
app.get("/api/resources", (req, res) => {
  db.all(
    "SELECT * FROM resources WHERE status = 'approved'",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.post(
  "/api/resources/upload",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    const { title, category } = req.body;
    const userId = req.user.id;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const fileUrl = req.file ? `${baseUrl}/uploads/${req.file.filename}` : "";
    const fileSize = req.file
      ? (req.file.size / (1024 * 1024)).toFixed(2) + " MB"
      : "0 MB";
    const fileType = req.file
      ? path.extname(req.file.originalname).substring(1).toUpperCase()
      : "PDF";

    const status = req.user.role === "admin" ? "approved" : "pending";

    db.run(
      "INSERT INTO resources (title, category, fileUrl, uploadedBy, status) VALUES (?, ?, ?, ?, ?)",
      [title, category, fileUrl, userId, status],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
          id: this.lastID,
          fileUrl,
          size: fileSize,
          type: fileType,
          status,
          date: new Date().toISOString().split("T")[0],
        });
      },
    );
  },
);

app.delete("/api/resources/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM resources WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Resource not found" });

    // Only admin or the person who uploaded can delete
    if (req.user.role !== "admin" && req.user.id !== row.uploadedBy) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Extract filename from URL
    const filename = path.basename(row.fileUrl);
    const filePath = path.join(__dirname, "uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.run("DELETE FROM resources WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Resource deleted successfully" });
    });
  });
});

// Admin Resource Approval
app.get(
  "/api/admin/resources/pending",
  authenticateToken,
  isAdmin,
  (req, res) => {
    db.all(
      "SELECT r.*, u.name as uploaderName FROM resources r JOIN users u ON r.uploadedBy = u.id WHERE r.status = 'pending'",
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      },
    );
  },
);

app.put(
  "/api/admin/resources/:id/approve",
  authenticateToken,
  isAdmin,
  (req, res) => {
    const { id } = req.params;
    db.run(
      "UPDATE resources SET status = 'approved' WHERE id = ?",
      [id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Resource approved", changes: this.changes });
      },
    );
  },
);

app.put(
  "/api/admin/resources/:id/reject",
  authenticateToken,
  isAdmin,
  (req, res) => {
    const { id } = req.params;
    db.get("SELECT fileUrl FROM resources WHERE id = ?", [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Resource not found" });

      const filename = path.basename(row.fileUrl);
      const filePath = path.join(__dirname, "uploads", filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      db.run("DELETE FROM resources WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Resource rejected and deleted" });
      });
    });
  },
);

// Admin - Student Management
app.get("/api/admin/students", authenticateToken, isAdmin, (req, res) => {
  db.all(
    "SELECT id, name, email, role, studentId FROM users WHERE role = 'student' ORDER BY id DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.post(
  "/api/admin/students",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { name, email, password, studentId } = req.body;
    const role = "student";

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    try {
      const hashedPassword = password;
      db.run(
        "INSERT INTO users (name, email, password, role, studentId) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role, studentId],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE"))
              return res
                .status(400)
                .json({ error: "Email or Student ID already exists" });
            return res.status(500).json({ error: err.message });
          }
          res
            .status(201)
            .json({ id: this.lastID, name, email, role, studentId });
        },
      );
    } catch (e) {
      res.status(500).json({ error: "Failed to create student" });
    }
  },
);

app.delete(
  "/api/admin/students/:id",
  authenticateToken,
  isAdmin,
  (req, res) => {
    const { id } = req.params;
    db.run(
      "DELETE FROM users WHERE id = ? AND role = 'student'",
      [id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          message: "Student deleted successfully",
          changes: this.changes,
        });
      },
    );
  },
);

// Attendance
app.get(
  "/api/admin/generate-qr-session",
  authenticateToken,
  isAdmin,
  (req, res) => {
    const sessionId = Math.random().toString(36).substring(7);
    const token = jwt.sign(
      {
        sessionId,
        type: "attendance_session",
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: "5m" }, // QR code valid for 5 minutes
    );
    res.json({ token, sessionId });
  },
);

app.post("/api/attendance", authenticateToken, (req, res) => {
  const { studentId, status, qrToken } = req.body;
  const date = new Date().toISOString().split("T")[0];

  // Validate QR Token if provided (for enhanced security)
  if (!qrToken) {
    return res
      .status(400)
      .json({ error: "QR code verification required for security." });
  }

  try {
    const decoded = jwt.verify(qrToken, JWT_SECRET);
    if (decoded.type !== "attendance_session") {
      return res.status(400).json({ error: "Invalid QR code type." });
    }
  } catch (err) {
    return res
      .status(400)
      .json({ error: "QR code expired or invalid. Please scan a fresh QR." });
  }

  db.get(
    "SELECT id, name FROM users WHERE studentId = ?",
    [studentId],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: "Student ID not found" });

      // Check if already marked for today
      db.get(
        "SELECT id FROM attendance WHERE userId = ? AND date = ?",
        [user.id, date],
        (err, existing) => {
          if (existing) {
            return res
              .status(400)
              .json({ error: "Attendance already marked for today." });
          }

          db.run(
            "INSERT INTO attendance (userId, date, status, verified) VALUES (?, ?, ?, 1)",
            [user.id, date, status || "present"],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
              res.status(201).json({
                id: this.lastID,
                userId: user.id,
                name: user.name,
                date,
                status: status || "present",
                verified: 1,
                message:
                  "Attendance recorded successfully with multi-factor verification.",
              });
            },
          );
        },
      );
    },
  );
});

app.get("/api/attendance/:userId", authenticateToken, (req, res) => {
  const { userId } = req.params;
  // Safety: Users can only see their own attendance unless admin
  if (req.user.role !== "admin" && req.user.id != userId) {
    return res.status(403).json({ error: "Access denied" });
  }

  db.all(
    "SELECT * FROM attendance WHERE userId = ? ORDER BY date DESC",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.get(
  "/api/admin/pending-attendance",
  authenticateToken,
  isAdmin,
  (req, res) => {
    db.all(
      `
    SELECT a.*, u.name, u.studentId
    FROM attendance a
    JOIN users u ON a.userId = u.id
    ORDER BY a.date DESC
  `,
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      },
    );
  },
);

// Stats API
app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

  try {
    const [students, attendance, resources, pendingResources, complaints] =
      await Promise.all([
        query("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
        query(
          "SELECT COUNT(*) as count FROM attendance WHERE date = ? AND verified = 1",
          [today],
        ),
        query(
          "SELECT COUNT(*) as count FROM resources WHERE status = 'approved'",
        ),
        query(
          "SELECT COUNT(*) as count FROM resources WHERE status = 'pending'",
        ),
        query(
          "SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'",
        ),
      ]);

    const stats = {
      totalStudents: students?.count || 0,
      presentToday:
        students?.count > 0
          ? Math.round(((attendance?.count || 0) / students.count) * 100)
          : 0,
      totalResources: resources?.count || 0,
      pendingResources: pendingResources?.count || 0,
      pendingComplaints: complaints?.count || 0,
    };

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendData.push({
        name: days[d.getDay()],
        attendance: Math.floor(Math.random() * 20) + 75,
        feedback: parseFloat((Math.random() * 0.5 + 4.2).toFixed(1)),
      });
    }
    stats.trendData = trendData;

    res.json(stats);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to compile campus intelligence reports." });
  }
});

// Events
app.get("/api/events", (req, res) => {
  db.all("SELECT * FROM events ORDER BY date ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/events", authenticateToken, isAdmin, (req, res) => {
  const { title, date, location, description, type } = req.body;
  db.run(
    "INSERT INTO events (title, date, location, description, type) VALUES (?, ?, ?, ?, ?)",
    [title, date, location, description, type],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res
        .status(201)
        .json({ id: this.lastID, title, date, location, description, type });
    },
  );
});

app.delete("/api/events/:id", authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM events WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Event deleted" });
  });
});

// Feedback & Complaints
app.post("/api/feedback", (req, res) => {
  const { facultyName, rating, comment } = req.body;
  db.run(
    "INSERT INTO feedback (facultyName, rating, comment) VALUES (?, ?, ?)",
    [facultyName, rating, comment],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Feedback submitted anonymously" });
    },
  );
});

app.post("/api/complaints", (req, res) => {
  const { title, description } = req.body;
  db.run(
    "INSERT INTO complaints (title, description, status) VALUES (?, ?, ?)",
    [title, description, "pending"],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Complaint filed anonymously" });
    },
  );
});

app.get("/api/admin/complaints", authenticateToken, isAdmin, (req, res) => {
  db.all("SELECT * FROM complaints ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put(
  "/api/admin/complaints/:id/resolve",
  authenticateToken,
  isAdmin,
  (req, res) => {
    const { id } = req.params;
    db.run(
      "UPDATE complaints SET status = 'resolved' WHERE id = ?",
      [id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Complaint resolved", changes: this.changes });
      },
    );
  },
);

app.get("/api/admin/feedback", authenticateToken, isAdmin, (req, res) => {
  db.all("SELECT * FROM feedback ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete(
  "/api/admin/feedback/:id",
  authenticateToken,
  isAdmin,
  (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM feedback WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Feedback deleted successfully",
        changes: this.changes,
      });
    });
  },
);

// TimeTable
app.get("/api/timetable", (req, res) => {
  const { className } = req.query;
  if (className) {
    db.get(
      "SELECT data FROM timetable WHERE className = ?",
      [className],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row ? JSON.parse(row.data) : null);
      },
    );
  } else {
    // Return the first one if no class specified, or null
    db.get("SELECT data, className FROM timetable LIMIT 1", (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        row ? { data: JSON.parse(row.data), className: row.className } : null,
      );
    });
  }
});

app.get("/api/timetable/classes", (req, res) => {
  db.all("SELECT className FROM timetable", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => r.className));
  });
});

app.post("/api/timetable", authenticateToken, isAdmin, (req, res) => {
  const { className, data } = req.body;
  if (!className || !data) {
    return res.status(400).json({ error: "Class name and data are required" });
  }
  const jsonData = JSON.stringify(data);
  db.run(
    "INSERT INTO timetable (className, data) VALUES (?, ?) ON CONFLICT(className) DO UPDATE SET data = excluded.data",
    [className, jsonData],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Timetable updated successfully" });
    },
  );
});

// --- Visitors API ---
app.post("/api/visitors", (req, res) => {
  const { name, contact, purpose, visitDate } = req.body;
  db.run(
    "INSERT INTO visitors (name, contact, purpose, visitDate) VALUES (?, ?, ?, ?)",
    [name, contact, purpose, visitDate],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: "Visitor request submitted" });
    }
  );
});

app.get("/api/visitors", authenticateToken, (req, res) => {
  db.all("SELECT * FROM visitors ORDER BY visitDate DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put("/api/visitors/:id/status", authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { status, entryTime, exitTime } = req.body;
  db.run(
    "UPDATE visitors SET status = ?, entryTime = ?, exitTime = ? WHERE id = ?",
    [status, entryTime || null, exitTime || null, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Visitor status updated" });
    }
  );
});

// --- Out Pass API ---
app.post("/api/outpass", authenticateToken, (req, res) => {
  const { reason, destination, departureDate, returnDate } = req.body;
  const studentId = req.user.id;
  const studentName = req.user.name;

  db.run(
    "INSERT INTO out_pass (studentId, studentName, reason, destination, departureDate, returnDate) VALUES (?, ?, ?, ?, ?, ?)",
    [studentId, studentName, reason, destination, departureDate, returnDate],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: "Out-pass request submitted" });
    }
  );
});

app.get("/api/outpass", authenticateToken, (req, res) => {
  const query = req.user.role === 'admin' 
    ? "SELECT * FROM out_pass ORDER BY departureDate DESC"
    : "SELECT * FROM out_pass WHERE studentId = ? ORDER BY departureDate DESC";
  const params = req.user.role === 'admin' ? [] : [req.user.id];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put("/api/outpass/:id/approve", authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE out_pass SET status = 'approved' WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Out-pass approved" });
    }
  );
});

app.put("/api/outpass/:id/reject", authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE out_pass SET status = 'rejected' WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Out-pass rejected" });
    }
  );
});

// Chat AI
app.post("/api/chat", (req, res) => chatbot.handleChat(req, res, db));

app.listen(PORT, () => {
  console.log(`[System] College 360 Core running on port ${PORT}`);
});
