import { useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';

const MainLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold tracking-tighter text-2xl animate-pulse uppercase">TourneyPro</div>;
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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 ml-64 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
