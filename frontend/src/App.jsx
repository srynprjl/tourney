import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { authAPI, tournamentAPI, matchAPI } from './api';
import { Trophy, Users, Play, Plus, LogOut, Moon, Sun, Settings, Trash2, Edit3, LayoutDashboard, ChevronRight, Menu, X, Save, ArrowRightCircle, CheckCircle2, AlertCircle } from 'lucide-react';
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

const Layout = ({ children }) => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  ];

  if (!localStorage.getItem('token') && !['/login', '/register'].includes(location.pathname)) {
    return <Navigate to="/login" />;
  }

  if (['/login', '/register'].includes(location.pathname)) {
    return children;
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

        <nav className="flex-1 px-4 space-y-2">
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
        {children}
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
      const res = await authAPI.post('/login', { username, password });
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
      await authAPI.post('/register', { username, password });
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

const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('knockout');
  const [isDouble, setIsDouble] = useState(false);
  const [groupCount, setGroupCount] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [promoteCount, setPromoteCount] = useState(2);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await tournamentAPI.get('/tournaments');
      setTournaments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { 
      name, 
      type, 
      is_double: isDouble, 
      group_count: parseInt(groupCount), 
      teams_per_group: parseInt(teamsPerGroup), 
      promote_count: parseInt(promoteCount) 
    };
    try {
      if (editingId) {
        await tournamentAPI.put(`/tournaments/${editingId}`, data);
        setEditingId(null);
      } else {
        await tournamentAPI.post('/tournaments', data);
      }
      setName('');
      setEditingId(null);
      fetchTournaments();
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament? All data will be lost.')) return;
    try {
      await tournamentAPI.delete(`/tournaments/${id}`);
      fetchTournaments();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header>
        <h1 className="text-4xl font-black tracking-tight mb-2">Tournaments</h1>
        <p className="text-muted-foreground">Manage your leagues and knockout brackets</p>
      </header>

      <Card className="border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit3 size={20} className="text-primary"/> : <Plus size={20} className="text-primary"/>}
            {editingId ? 'Edit Tournament' : 'New Tournament'}
          </CardTitle>
          <CardDescription>Configure your tournament settings below</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Cup 2026" required />
            </div>
            {!editingId && (
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
            )}
            
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

            <div className="flex items-center space-x-2 pt-4">
              <Switch id="double-leg" checked={isDouble} onCheckedChange={setIsDouble} />
              <Label htmlFor="double-leg">Double Leg / Round Robin</Label>
            </div>
          </CardContent>
          <CardFooter className="justify-end bg-muted/50 p-4">
            <Button type="submit" className="gap-2">
               {editingId ? <Save size={18}/> : <Plus size={18}/>}
               {editingId ? 'Save Changes' : 'Create Tournament'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <Card key={t.id} className="overflow-hidden transition-all hover:shadow-lg group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="line-clamp-1">{t.name}</CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(t.id); setName(t.name); setIsDouble(t.is_double); setGroupCount(t.group_count); setTeamsPerGroup(t.teams_per_group); setPromoteCount(t.promote_count); setType(t.type); }}>
                     <Edit3 size={14}/>
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTournament(t.id)}>
                     <Trash2 size={14}/>
                   </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap pt-2">
                <Badge variant="secondary" className="capitalize">{t.type}</Badge>
                {t.is_double && <Badge variant="outline">Double</Badge>}
                {t.group_count > 1 && <Badge variant="outline">{t.group_count} Groups</Badge>}
              </div>
            </CardHeader>
            <CardFooter className="bg-muted/30 py-3">
              <Button asChild variant="link" className="px-0 h-auto font-bold">
                <Link to={`/tournament/${t.id}`}>View Tournament <ChevronRight size={16} className="ml-1" /></Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
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
      const res = await tournamentAPI.get(`/tournaments/${id}`);
      setTournament(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStandings = async () => {
    try {
      const res = await tournamentAPI.get(`/tournaments/${id}/standings`);
      setStandings(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addOrUpdateTeam = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await tournamentAPI.put(`/tournaments/${id}/teams/${editingTeam.id}`, { name: teamName });
        setEditingTeam(null);
      } else {
        await tournamentAPI.post(`/tournaments/${id}/teams`, { name: teamName });
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
      await tournamentAPI.delete(`/tournaments/${id}/teams/${teamId}`);
      fetchTournament();
    } catch (err) {
      alert('Remove failed');
    }
  };

  const generate = async () => {
    try {
      await tournamentAPI.post(`/tournaments/${id}/generate`);
      fetchTournament();
      fetchStandings();
    } catch (err) {
      alert('Generation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const promote = async () => {
    if (!window.confirm('Promote top teams to knockout stage? This will generate new matches.')) return;
    try {
      await tournamentAPI.post(`/tournaments/${id}/promote`);
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
      await matchAPI.put(`/matches/${matchId}/score`, { team1_score: score1, team2_score: score2 });
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

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/tournament/:id" element={<TournamentView />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
