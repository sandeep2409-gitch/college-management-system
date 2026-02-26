import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Layout, LogOut, User, Sun, Moon } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Resources from './pages/Resources';
import Feedback from './pages/Feedback';
import Complaints from './pages/Complaints';
import Login from './pages/Login';
import Register from './pages/Register';
import ManageStudents from './pages/ManageStudents';
import EventCalendar from './pages/EventCalendar';
import TimeTable from './pages/TimeTable';
import Profile from './pages/Profile';
import Visitors from './pages/Visitors';
import OutPass from './pages/OutPass';
import ChatBot from './components/ChatBot';
import { NotificationProvider } from './context/NotificationContext';


import MainLayout from './components/MainLayout';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/manage-students" element={<ManageStudents />} />
                <Route path="/calendar" element={<EventCalendar />} />
                <Route path="/timetable" element={<TimeTable />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/visitors" element={<Visitors />} />
                <Route path="/outpass" element={<OutPass />} />
              </Routes>
              <ChatBot />
            </MainLayout>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
