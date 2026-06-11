import { useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';

const MainLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-black text-muted-foreground animate-pulse">CONNECTING TO TOURNEYPRO CLOUD...</div>;
  }

  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isLandingPage = location.pathname === '/';

  if (!user && !isAuthPage && !isLandingPage) {
    return <Navigate to="/login" />;
  }

  if (isAuthPage || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 p-8 ml-64">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
