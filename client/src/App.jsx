import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import Pseudonym from './pages/Pseudonym';
import Service from './pages/Service';
import Reports from './pages/Reports';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminBlacklist from './pages/AdminBlacklist';
import AdminReports from './pages/AdminReports';
import AdminLogs from './pages/AdminLogs';

// Gate for signed-in areas. `role` restricts a section to one role (the API enforces this too).
function Protected({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Layout />;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={!user ? '/login' : user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Protected role="user" />}>
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/pseudonym" element={<Pseudonym />} />
        <Route path="/service" element={<Service />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      <Route element={<Protected role="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/blacklist" element={<AdminBlacklist />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
