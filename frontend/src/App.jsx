import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import api from './api';
import { Trophy, Users, Play, Plus, LogOut, Moon, Sun, Settings, Trash2, Edit3, LayoutDashboard, ChevronRight, Menu, X, Save, ArrowRightCircle, CheckCircle2, AlertCircle, Zap, Eye, EyeOff } from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('http://localhost:8081/verify').then(res => {
        setUser(res.data);
      }).catch(() => {
        logout();
      });
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

const useUser = () => useContext(UserContext);

const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

const Layout = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const { user, logout } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  ];

  if (!localStorage.getItem('token') && !['/login', '/register', '/admin-login'].includes(location.pathname)) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col fixed h-full z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary w-6 h-6" />
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight">TourneyPro</span>}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center p-3 rounded-lg transition-all",
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium">{item.name}</span>}
            </Link>
          ))}
          
          {isSidebarOpen && (
            <>
              <Separator className="my-2" />
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tournaments</p>
              </div>
              <Link
                to="/my-tournaments"
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all text-sm",
                  location.pathname === '/my-tournaments'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Trophy size={18} />
                <span className="ml-3 font-medium">My Tournaments</span>
              </Link>
              <Link
                to="/public-tournaments"
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all text-sm",
                  location.pathname === '/public-tournaments'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Eye size={18} />
                <span className="ml-3 font-medium">Public Tournaments</span>
              </Link>
              {user?.is_admin && (
                <>
                  <Separator className="my-2" />
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
                  </div>
                  <Link
                    to="/admin"
                    className={cn(
                      "flex items-center p-3 rounded-lg transition-all text-sm",
                      location.pathname === '/admin'
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Zap size={18} />
                    <span className="ml-3 font-medium">Admin Dashboard</span>
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {isSidebarOpen && <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 p-8",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        <Outlet />
      </main>
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('http://localhost:8081/login', { username, password });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Trophy className="text-primary w-6 h-6" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full font-bold h-11" type="submit">Sign In</Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Create one</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('http://localhost:8081/register', { username, password });
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your details below to get started</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full font-bold h-11" variant="secondary" type="submit">Register</Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

const TournamentCreateModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('knockout');
  const [isDouble, setIsDouble] = useState(false);
  const [groupCount, setGroupCount] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [promoteCount, setPromoteCount] = useState(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name,
      type,
      is_double: isDouble,
      group_count: parseInt(groupCount),
      teams_per_group: parseInt(teamsPerGroup),
      promote_count: parseInt(promoteCount),
    };
    try {
      await api.post('http://localhost:8082/tournaments', data);
      setName('');
      setType('knockout');
      setIsDouble(false);
      setGroupCount(1);
      setTeamsPerGroup(4);
      setPromoteCount(2);
      onSuccess();
    } catch (err) {
      alert('Failed to create tournament: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
          <DialogDescription>Configure your tournament settings</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tournament Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Cup 2026" required />
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="knockout">Knockout</SelectItem>
                <SelectItem value="group">Group Stage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'group' && (
            <>
              <div className="space-y-2">
                <Label>Number of Groups</Label>
                <Input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teams per Group</Label>
                <Input type="number" min="2" value={teamsPerGroup} onChange={(e) => setTeamsPerGroup(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Promote per Group</Label>
                <Input type="number" min="0" value={promoteCount} onChange={(e) => setPromoteCount(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex items-center space-x-2">
            <Switch id="double-leg" checked={isDouble} onCheckedChange={setIsDouble} />
            <Label htmlFor="double-leg">Double Leg / Round Robin</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="gap-2">
              <Plus size={18} /> Create Tournament
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('http://localhost:8082/tournaments');
      setTournaments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament? All data will be lost.')) return;
    try {
      await api.delete(`http://localhost:8082/tournaments/${id}`);
      fetchTournaments();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const togglePublic = async (id, isPublic) => {
    try {
      await api.put(`http://localhost:8082/tournaments/${id}/toggle-public`);
      fetchTournaments();
    } catch (err) {
      alert('Failed to update tournament visibility');
    }
  };

  const myTournaments = tournaments.filter(t => !t.is_public);
  const stats = {
    total: tournaments.length,
    public: tournaments.filter(t => t.is_public).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to TourneyPro - Manage your tournaments</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Tournaments</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Trophy className="text-primary/30" size={40} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Public Tournaments</p>
                <p className="text-3xl font-bold">{stats.public}</p>
              </div>
              <Eye className="text-primary/30" size={40} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Tournament Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Tournaments</h2>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus size={18} /> New Tournament
        </Button>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myTournaments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No tournaments yet. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          myTournaments.map((t) => (
            <Card key={t.id} className="overflow-hidden transition-all hover:shadow-lg group">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="line-clamp-2">{t.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTournament(t.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap pt-2">
                  <Badge variant="secondary" className="capitalize text-xs">{t.type}</Badge>
                  {t.is_double && <Badge variant="outline" className="text-xs">Double</Badge>}
                  {t.group_count > 1 && <Badge variant="outline" className="text-xs">{t.group_count} Groups</Badge>}
                  <Badge variant={t.is_public ? "default" : "secondary"} className="text-xs ml-auto">
                    {t.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
              </CardHeader>
              <CardFooter className="bg-muted/30 py-3 flex flex-col gap-2">
                <Button asChild variant="link" className="px-0 h-auto font-bold w-full justify-start">
                  <Link to={`/tournament/${t.id}`}>View Tournament <ChevronRight size={16} className="ml-1" /></Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => togglePublic(t.id, t.is_public)}>
                  {t.is_public ? <EyeOff size={14} /> : <Eye size={14} />}
                  {t.is_public ? 'Make Private' : 'Make Public'}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Tournament Create Modal */}
      <TournamentCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={() => { setIsCreateModalOpen(false); fetchTournaments(); }} />
    </div>
  );
};

const TournamentView = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournament();
    fetchStandings();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const res = await api.get(`http://localhost:8082/tournaments/${id}`);
      setTournament(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStandings = async () => {
    try {
      const res = await api.get(`http://localhost:8082/tournaments/${id}/standings`);
      setStandings(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addOrUpdateTeam = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await api.put(`http://localhost:8082/tournaments/${id}/teams/${editingTeam.id}`, { name: teamName });
        setEditingTeam(null);
      } else {
        await api.post(`http://localhost:8082/tournaments/${id}/teams`, { name: teamName });
      }
      setTeamName('');
      fetchTournament();
    } catch (err) {
      alert('Action failed');
    }
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm('Remove team?')) return;
    try {
      await api.delete(`http://localhost:8082/tournaments/${id}/teams/${teamId}`);
      fetchTournament();
    } catch (err) {
      alert('Remove failed');
    }
  };

  const generate = async () => {
    try {
      await api.post(`http://localhost:8082/tournaments/${id}/generate`);
      fetchTournament();
      fetchStandings();
    } catch (err) {
      alert('Generation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const promote = async () => {
    if (!window.confirm('Promote top teams to knockout stage? This will generate new matches.')) return;
    try {
      await api.post(`http://localhost:8082/tournaments/${id}/promote`);
      fetchTournament();
    } catch (err) {
      alert('Promotion failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const updateScore = async (matchId, t1s, t2s) => {
    const score1 = parseInt(t1s);
    const score2 = parseInt(t2s);
    if (score1 < 0 || score2 < 0) {
      alert('Scores cannot be negative');
      return;
    }
    try {
      await api.put(`http://localhost:8083/matches/${matchId}/score`, { team1_score: score1, team2_score: score2 });
      fetchTournament();
      fetchStandings();
    } catch (err) {
      alert('Score update failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!tournament) return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-muted-foreground animate-pulse">Loading tournament...</p></div>;

  const groupedMatches = tournament.matches?.reduce((acc, match) => {
    const stageKey = match.stage === 1 ? 'Knockout Stage' : 'Group Phase';
    if (!acc[stageKey]) acc[stageKey] = {};
    const round = match.round || 1;
    if (!acc[stageKey][round]) acc[stageKey][round] = [];
    acc[stageKey][round].push(match);
    return acc;
  }, {}) || {};

  const getRoundName = (round, stage, totalRoundsInStage) => {
    if (stage === 'Group Phase') return `Matchday ${round}`;
    if (round === totalRoundsInStage) return 'Final';
    if (round === totalRoundsInStage - 1) return 'Semifinals';
    if (round === totalRoundsInStage - 2) return 'Quarterfinals';
    return `Round ${round}`;
  };

  const requiredTeams = tournament.type === 'group' && tournament.group_count > 1 ? tournament.group_count * tournament.teams_per_group : 0;
  const canGenerate = requiredTeams === 0 || tournament.teams?.length === requiredTeams;

  const groupedStandings = standings.reduce((acc, s) => {
    const groupName = s.group_name || 'Overall';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/"><ChevronRight className="rotate-180" size={16}/> Back</Link>
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <h1 className="text-3xl font-black tracking-tight">{tournament.name}</h1>
      </div>
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 uppercase">{tournament.type}</Badge>
          {tournament.is_double && <Badge variant="secondary" className="px-3 py-1 uppercase">Double</Badge>}
          {tournament.group_count > 1 && <Badge variant="secondary" className="px-3 py-1 uppercase">{tournament.group_count} Groups</Badge>}
        </div>
        <div className="flex gap-3">
           {tournament.type === 'group' && tournament.promote_count > 0 && tournament.matches?.length > 0 && (
             <Button onClick={promote} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                <ArrowRightCircle size={18}/> Promote Teams
             </Button>
           )}
          <Button 
            onClick={generate} 
            disabled={!canGenerate}
            className="gap-2"
          >
            <Play size={18}/> {tournament.matches?.length > 0 ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-8">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users size={18} className="text-primary"/> Teams
                </CardTitle>
                {requiredTeams > 0 && (
                  <Badge variant={tournament.teams?.length === requiredTeams ? "default" : "destructive"}>
                    {tournament.teams?.length}/{requiredTeams}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addOrUpdateTeam} className="flex gap-2">
                <Input 
                  placeholder="Team name"
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)} 
                  required 
                  disabled={!editingTeam && requiredTeams > 0 && tournament.teams?.length >= requiredTeams}
                />
                <Button size="icon" type="submit">
                  {editingTeam ? <Save size={16}/> : <Plus size={16}/>}
                </Button>
              </form>
              <div className="space-y-2">
                {tournament.teams?.sort((a,b) => (a.group_name || '').localeCompare(b.group_name || '')).map((team) => (
                  <div key={team.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-md group">
                    <div className="flex items-center gap-3">
                      {team.group_name && <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center rounded-sm font-bold">{team.group_name}</Badge>}
                      <span className="text-sm font-semibold">{team.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTeam(team); setTeamName(team.name); }}>
                        <Edit3 size={12}/>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTeam(team.id)}>
                        <Trash2 size={12}/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {Object.keys(groupedStandings).sort().map((groupName) => (
             <Card key={groupName}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base uppercase tracking-wider text-muted-foreground">
                    {groupName === 'Overall' ? 'Standings' : `Group ${groupName}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">Team</TableHead>
                        <TableHead className="text-center w-12">P</TableHead>
                        <TableHead className="text-center w-12">GD</TableHead>
                        <TableHead className="text-center w-16 font-bold text-primary">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedStandings[groupName].sort((a, b) => b.points - a.points || b.gd - a.gd).map((s) => (
                        <TableRow key={s.team_id}>
                          <TableCell className="pl-6 font-medium">{s.team_name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{s.played}</TableCell>
                          <TableCell className={cn(
                            "text-center font-semibold",
                            s.gd > 0 ? "text-green-500" : s.gd < 0 ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {s.gd > 0 ? `+${s.gd}` : s.gd}
                          </TableCell>
                          <TableCell className="text-center font-bold text-primary">{s.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
             </Card>
          ))}
        </div>

        <div className="xl:col-span-8 space-y-12">
          {Object.keys(groupedMatches).reverse().map((stage) => (
             <div key={stage} className="space-y-6">
                <div className="flex items-center gap-4">
                   <h2 className="text-2xl font-bold">{stage}</h2>
                   <Separator className="flex-1" />
                </div>

                {Object.keys(groupedMatches[stage]).sort((a, b) => parseInt(a) - parseInt(b)).map((round) => {
                  const matchesInRound = [...groupedMatches[stage][round]].sort((a, b) => {
                    if (a.group_name !== b.group_name) return (a.group_name || '').localeCompare(b.group_name || '');
                    return a.id.localeCompare(b.id);
                  });
                  return (
                    <div key={round} className="space-y-4">
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                        {getRoundName(parseInt(round), stage, Object.keys(groupedMatches[stage]).length)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchesInRound.map((match) => {
                          const t1 = tournament.teams.find(t => t.id === match.team1_id);
                          const t2 = tournament.teams.find(t => t.id === match.team2_id);
                          return (
                            <Card key={match.id} className="relative group overflow-hidden hover:border-primary/50 transition-colors">
                              {match.group_name && (
                                <div className="absolute top-0 left-0 bg-primary h-full w-1" />
                              )}
                              <CardContent className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2 max-w-[70%]">
                                    {match.winner_id === match.team1_id && <CheckCircle2 size={14} className="text-primary"/>}
                                    <span className={cn(
                                      "font-bold truncate text-sm",
                                      match.winner_id === match.team1_id ? "text-primary" : "text-foreground"
                                    )}>
                                      {t1?.name || (match.stage === 1 ? 'TBD' : 'Bye')}
                                    </span>
                                  </div>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-14 h-8 text-center font-bold p-0 bg-muted/50 border-none"
                                    defaultValue={match.team1_score}
                                    onBlur={(e) => updateScore(match.id, e.target.value, match.team2_score)}
                                  />
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2 max-w-[70%]">
                                    {match.winner_id === match.team2_id && <CheckCircle2 size={14} className="text-primary"/>}
                                    <span className={cn(
                                      "font-bold truncate text-sm",
                                      match.winner_id === match.team2_id ? "text-primary" : "text-foreground"
                                    )}>
                                      {t2?.name || (match.stage === 1 ? 'TBD' : 'Bye')}
                                    </span>
                                  </div>
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-14 h-8 text-center font-bold p-0 bg-muted/50 border-none"
                                    defaultValue={match.team2_score}
                                    onBlur={(e) => updateScore(match.id, match.team1_score, e.target.value)}
                                  />
                                </div>
                                {match.group_name && (
                                  <div className="text-[10px] font-black uppercase text-muted-foreground text-right">
                                    Group {match.group_name}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
             </div>
          ))}
          {tournament.matches?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 bg-muted/20 rounded-xl border-2 border-dashed">
               <AlertCircle size={40} className="text-muted-foreground mb-4" />
               <p className="text-lg font-medium text-muted-foreground">No matches generated yet</p>
               <Button variant="link" onClick={generate}>Click here to generate matches</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MyTournaments = () => {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('http://localhost:8082/tournaments');
      const my = (res.data || []).filter(t => !t.is_public);
      setTournaments(my);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament? All data will be lost.')) return;
    try {
      await api.delete(`http://localhost:8082/tournaments/${id}`);
      fetchTournaments();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const togglePublic = async (id) => {
    try {
      await api.put(`http://localhost:8082/tournaments/${id}/toggle-public`);
      fetchTournaments();
    } catch (err) {
      alert('Failed to update tournament visibility');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight mb-2">My Tournaments</h1>
        <p className="text-muted-foreground">Tournaments you created (private only)</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No private tournaments. Create one or make a public tournament private!</p>
            </CardContent>
          </Card>
        ) : (
          tournaments.map((t) => (
            <Card key={t.id} className="overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="line-clamp-2">{t.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTournament(t.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap pt-2">
                  <Badge variant="secondary" className="capitalize text-xs">{t.type}</Badge>
                  {t.group_count > 1 && <Badge variant="outline" className="text-xs">{t.group_count} Groups</Badge>}
                </div>
              </CardHeader>
              <CardFooter className="bg-muted/30 py-3 flex flex-col gap-2">
                <Button asChild variant="link" className="px-0 h-auto font-bold w-full justify-start">
                  <Link to={`/tournament/${t.id}`}>View Tournament <ChevronRight size={16} className="ml-1" /></Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => togglePublic(t.id)}>
                  <Eye size={14} /> Make Public
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('http://localhost:8082/tournaments');
      const pub = (res.data || []).filter(t => t.is_public);
      setTournaments(pub);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight mb-2">Public Tournaments</h1>
        <p className="text-muted-foreground">Tournaments shared by other users - View only</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No public tournaments available</p>
            </CardContent>
          </Card>
        ) : (
          tournaments.map((t) => (
            <Card key={t.id} className="overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="line-clamp-2">{t.name}</CardTitle>
                <div className="flex gap-2 flex-wrap pt-2">
                  <Badge variant="secondary" className="capitalize text-xs">{t.type}</Badge>
                  {t.group_count > 1 && <Badge variant="outline" className="text-xs">{t.group_count} Groups</Badge>}
                  <Badge variant="default" className="text-xs ml-auto">Public</Badge>
                </div>
              </CardHeader>
              <CardFooter className="bg-muted/30 py-3">
                <Button asChild variant="link" className="px-0 h-auto font-bold">
                  <Link to={`/tournament/${t.id}`}>View Tournament <ChevronRight size={16} className="ml-1" /></Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      const token = localStorage.getItem('token');
      api.get('http://localhost:8081/verify').then(res => {
        if (res.data.is_admin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      });
    }
  }, [navigate, setUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('http://localhost:8081/login', { username, password });
      localStorage.setItem('token', res.data.token);
      
      const verifyRes = await api.get('http://localhost:8081/verify');
      if (!verifyRes.data.is_admin) {
        alert('Admin access required');
        localStorage.removeItem('token');
        return;
      }
      
      setUser(verifyRes.data);
      navigate('/admin');
    } catch (err) {
      alert('Admin login failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Zap className="text-primary w-6 h-6" />
          </div>
          <CardTitle className="text-3xl font-bold">Admin Access</CardTitle>
          <CardDescription>Enter admin credentials to access the dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username</Label>
              <Input id="admin-username" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full font-bold h-11" type="submit">Sign In as Admin</Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary font-semibold hover:underline">Back to user login</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [stats, setStats] = useState({});
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/');
      return;
    }
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      const usersRes = await api.get('http://localhost:8081/admin/users');
      setUsers(usersRes.data || []);
      
      const statsRes = await api.get('http://localhost:8081/admin/stats');
      setStats(statsRes.data || {});
      
      const tournamentsRes = await api.get('http://localhost:8082/admin/tournaments');
      setAllTournaments(tournamentsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user? All their tournaments will also be deleted.')) return;
    try {
      await api.delete(`http://localhost:8081/admin/users/${id}`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const toggleAdmin = async (id) => {
    try {
      await api.put(`http://localhost:8081/admin/users/${id}/toggle-admin`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to toggle admin status');
    }
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament permanently?')) return;
    try {
      await api.delete(`http://localhost:8082/admin/tournaments/${id}`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to delete tournament');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">System administration and monitoring</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Users</p>
                <p className="text-3xl font-bold">{stats.total_users || 0}</p>
              </div>
              <Users className="text-primary/30" size={40} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Admin Accounts</p>
                <p className="text-3xl font-bold">{stats.admin_count || 0}</p>
              </div>
              <Zap className="text-primary/30" size={40} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage users and admin access</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Admin Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    <Badge variant={u.is_admin ? "default" : "secondary"}>
                      {u.is_admin ? 'Admin' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAdmin(u.id)}>
                      {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tournaments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tournaments</CardTitle>
          <CardDescription>Manage all system tournaments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Creator ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTournaments.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium line-clamp-1">{t.name}</TableCell>
                    <TableCell className="capitalize text-sm">{t.type}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_public ? "default" : "secondary"} className="text-xs">
                        {t.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.creator_id}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => deleteTournament(t.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/my-tournaments" element={<MyTournaments />} />
              <Route path="/public-tournaments" element={<PublicTournaments />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/tournament/:id" element={<TournamentView />} />
            </Route>
          </Routes>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
