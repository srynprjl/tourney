import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ApplicationPage from '@/pages/auth/ApplicationPage';
import LandingPage from '@/pages/LandingPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import TournamentsPage from '@/pages/tournament/TournamentsPage';
import TournamentDetailsPage from '@/pages/tournament/TournamentDetailsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import TeamsListPage from '@/pages/team/TeamsListPage';
import TeamDashboardPage from '@/pages/team/TeamDashboardPage';
import PublicProfilePage from '@/pages/profile/PublicProfilePage';
import VenuesPage from '@/pages/venue/VenuesPage';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <MainLayout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/apply" element={<ApplicationPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournament/:id" element={<TournamentDetailsPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/teams" element={<TeamsListPage />} />
              <Route path="/team/:id" element={<TeamDashboardPage />} />
              <Route path="/player/:username" element={<PublicProfilePage />} />
              <Route path="/venues" element={<VenuesPage />} />
            </Routes>
          </MainLayout>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}


export default App;
