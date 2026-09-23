import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import StudentManagement from './pages/admin/StudentManagement';
import FeeManagement from './pages/admin/FeeManagement';
import AIInsights from './pages/admin/AIInsights';
import BatchManagement from './pages/admin/BatchManagement';
import StudentDetail from './pages/admin/StudentDetail';
import AttendanceOverview from './pages/admin/AttendanceOverview';
import AddStudent from './pages/admin/AddStudent';
import TeacherManagement from './pages/admin/TeacherManagement';

// Teacher Pages  
import TeacherDashboard from './pages/TeacherDashboard';
import AttendanceMarking from './pages/teacher/AttendanceMarking';
import ScoreUpdate from './pages/teacher/ScoreUpdate';
import StudentsList from './pages/teacher/StudentsList';
import TeacherMessages from './pages/teacher/Messages';
import TeacherHistory from './pages/teacher/TeacherHistory';

// Parent Pages
import ParentDashboard from './pages/ParentDashboard';
import AttendanceDetails from './pages/parent/AttendanceDetails';
import PerformanceDetails from './pages/parent/PerformanceDetails';
import FeeDetails from './pages/parent/FeeDetails';
import ParentMessages from './pages/parent/ParentMessages';

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.role ? parsed : null;
  } catch (e) {
    return null;
  }
}

const ProtectedRoute = ({ allowedRole, children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.firstLogin) return <Navigate to="/change-password" replace />;
  if (String(user.role).toUpperCase() !== String(allowedRole).toUpperCase()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const user = getStoredUser();

  const getDefaultRedirect = () => {
    if (!user) return "/login";
    if (user.firstLogin) return "/change-password";
    const role = String(user.role || '').toLowerCase();
    if (role === 'admin') return "/admin";
    if (role === 'teacher') return "/teacher";
    if (role === 'parent') return "/parent";
    return "/login";
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRole="ADMIN"><StudentManagement /></ProtectedRoute>} />
          <Route path="/admin/students/add" element={<ProtectedRoute allowedRole="ADMIN"><AddStudent /></ProtectedRoute>} />
          <Route path="/admin/students/edit/:id" element={<ProtectedRoute allowedRole="ADMIN"><AddStudent /></ProtectedRoute>} />
          <Route path="/admin/students/:id" element={<ProtectedRoute allowedRole="ADMIN"><StudentDetail /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute allowedRole="ADMIN"><TeacherManagement /></ProtectedRoute>} />
          <Route path="/admin/batches" element={<ProtectedRoute allowedRole="ADMIN"><BatchManagement /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute allowedRole="ADMIN"><AttendanceOverview /></ProtectedRoute>} />
          <Route path="/admin/fees" element={<ProtectedRoute allowedRole="ADMIN"><FeeManagement /></ProtectedRoute>} />
          <Route path="/admin/insights" element={<ProtectedRoute allowedRole="ADMIN"><AIInsights /></ProtectedRoute>} />

          {/* Teacher Routes */}
          <Route path="/teacher" element={<ProtectedRoute allowedRole="TEACHER"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute allowedRole="TEACHER"><AttendanceMarking /></ProtectedRoute>} />
          <Route path="/teacher/scores" element={<ProtectedRoute allowedRole="TEACHER"><ScoreUpdate /></ProtectedRoute>} />
          <Route path="/teacher/students" element={<ProtectedRoute allowedRole="TEACHER"><StudentsList /></ProtectedRoute>} />
          <Route path="/teacher/history" element={<ProtectedRoute allowedRole="TEACHER"><TeacherHistory /></ProtectedRoute>} />
          <Route path="/teacher/messages" element={<ProtectedRoute allowedRole="TEACHER"><TeacherMessages /></ProtectedRoute>} />

          {/* Parent Routes */}
          <Route path="/parent" element={<ProtectedRoute allowedRole="PARENT"><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/attendance" element={<ProtectedRoute allowedRole="PARENT"><AttendanceDetails /></ProtectedRoute>} />
          <Route path="/parent/performance" element={<ProtectedRoute allowedRole="PARENT"><PerformanceDetails /></ProtectedRoute>} />
          <Route path="/parent/fees" element={<ProtectedRoute allowedRole="PARENT"><FeeDetails /></ProtectedRoute>} />
          <Route path="/parent/messages" element={<ProtectedRoute allowedRole="PARENT"><ParentMessages /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;