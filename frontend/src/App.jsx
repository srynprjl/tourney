import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import TournamentDetailsPage from '@/pages/tournament/TournamentDetailsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import TeamsListPage from '@/pages/team/TeamsListPage';
import TeamDashboardPage from '@/pages/team/TeamDashboardPage';
import MatchOfficiatingPage from '@/pages/match/MatchOfficiatingPage';
import PublicProfilePage from '@/pages/profile/PublicProfilePage';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <MainLayout>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tournament/:id" element={<TournamentDetailsPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/teams" element={<TeamsListPage />} />
              <Route path="/team/:id" element={<TeamDashboardPage />} />
              <Route path="/match/:id" element={<MatchOfficiatingPage />} />
              <Route path="/player/:username" element={<PublicProfilePage />} />
            </Routes>
          </MainLayout>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
