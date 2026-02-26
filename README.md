# College Management System (college360) - Project Overview

## Project Vision

College360 is a modern, full-stack ERP solution designed to automate university operations using advanced AI and real-time data analytics. It features a premium "Glassmorphism" UI/UX and focuses on efficiency, security, and student engagement.

---

## System Architecture

### 1. Frontend (The Interface)

- **Framework**: React.js with Vite for ultra-fast performance.
- **Styling**: Vanilla CSS3 with high-end Design Tokens (Variables).
- **Animations**: Framer Motion & CSS Keyframes for smooth transitions.
- **Icons**: Lucide-React institutional icon set.
- **Charts**: Recharts for real-time data visualization.
- **Navigation**: React Router DOM (Role-Based Protected Routes).

### 2. Backend (The Engine)

- **Server**: Node.js with Express.js.
- **Database**: SQLite3 (Server-side persistent storage).
- **AI Engine**: Google Gemini Pro API (Intelligent Student Assistant).
- **Authentication**: Multi-Identifier Login (Email or Student ID) with password-based security.
- **File Storage**: Multer-driven local storage for academic resources.

---

## Core Features & Workflows

### Smart Authentication

- **Dual-Login**: Users can log in using their registered Email or their Unique Student ID.
- **RBAC (Role-Based Access Control)**: Distinct interfaces for 'Admin' and 'Student' roles.

### Admin Intelligence Command (Admin Dashboard)

- **Real-time Analytics**: Automated calculation of daily attendance percentages and total student enrollment.
- **Engagement Velocity**: Visual charts showing campus participation trends over 7 days.
- **Student CRM**: Centralized registry to provision new students with automatic ID generation.
- **Audit Logs**: Master view of all campus activity, including attendance and grievance triage.

### AI-Verified Attendance (Student Portal)

- **Geofencing Verification**: Uses Browser Geolocation API to ensure students are physically present on campus (100m radius) before marking presence.
- **Face-Scan UI**: Simulated AI scanning interface for identity verification.
- **Automatic Sync**: Records are immediately updated in the SQLite database upon verification.

### Intelligent Campus Assistant (Chatbot)

- **Gemini AI Integration**: A personalized AI assistant that answers campus FAQs.
- **Real-time Context**: The search engine can query live database stats (e.g., "How many students are present today?" or "Show me my pending tasks").
- **Smart Navigation**: The bot can provide direct links to various modules (e.g., "Take me to resources").

### Academic Resource Hub

- **E-Library**: Admins can upload resources (PDFs, Notes) which are instantly categorized and made available for students to download.
- **Courseware Management**: Supports categorizing by subject and maintains file integrity on the server.

---

## Technical Implementation Details

### Database Schema (SQLite)

- **`users`**: Stores identity details, student IDs, and role assignments.
- **`attendance`**: Tracks daily presence with `verified` status flags and geofencing timestamps.
- **`resources`**: Manages file paths and metadata for student courseware.
- **`complaints` / `feedback`**: Handles institutional feedback loops with status tracking.

### Security Features

- **UNIQUE Constraints**: Prevents duplicate Student IDs or Email registrations at the database level.
- **Schema Healer**: The backend automatically migrates and adds missing columns (like `verified` or `studentId`) on startup to prevent system crashes.

# a project by cypher trio
