import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { 
  Users, Shield, Ban, Activity, AlertCircle, 
  CheckCircle2, RefreshCw, Trash2, UserPlus,
  LayoutGrid, Settings2, Trophy, HeartPulse,
  Signal, SignalHigh, SignalLow, Globe, Lock, Gavel
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [services, setServices] = useState([
    { id: 'auth', name: 'Auth Identity Core', url: '/auth/health', status: 'unknown' },
    { id: 'tournament', name: 'Tournament Engine', url: '/tournaments/health', status: 'unknown' },
    { id: 'match', name: 'Match Logic Processor', url: '/matches/health', status: 'unknown' },
    { id: 'team', name: 'Squad Roster Cloud', url: '/team/health', status: 'unknown' },
    { id: 'profile', name: 'Player Profile Hub', url: '/profile/health', status: 'unknown' },
    { id: 'realtime', name: 'WebSocket Realtime', url: '/realtime/health', status: 'unknown' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    checkHealth();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, tourneyRes] = await Promise.all([
        api.get('/auth/admin/users'),
        api.get('/auth/admin/stats'),
        api.get('/tournaments')
      ]);
      setUsers(usersRes.data || []);
      setStats(statsRes.data);
      setTournaments(tourneyRes.data || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    const updatedServices = await Promise.all(services.map(async (s) => {
      try {
        await api.get(s.url);
        return { ...s, status: 'healthy' };
      } catch (err) {
        return { ...s, status: 'unhealthy' };
      }
    }));
    setServices(updatedServices);
  };

  const toggleAdmin = async (id) => {
    try {
      await api.put(`/auth/admin/users/${id}/toggle-admin`);
      fetchData();
    } catch (err) {
      alert('Failed to update admin status');
    }
  };

  const toggleBan = async (id) => {
    try {
      await api.put(`/auth/admin/users/${id}/toggle-ban`);
      fetchData();
    } catch (err) {
      alert('Failed to update ban status');
    }
  };

  if (loading) return <div className="p-12 text-center font-black animate-pulse text-muted-foreground uppercase tracking-[0.3em]">SYNCHRONIZING GLOBAL OVERSEER...</div>;

  const tabs = [
    { id: 'users', label: 'Identity Control', icon: Users },
    { id: 'tournaments', label: 'Arena Registry', icon: Trophy },
    { id: 'infrastructure', label: 'System Vitals', icon: HeartPulse },
    { id: 'reports', label: 'Incidents', icon: AlertCircle },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <header className="flex justify-between items-end px-4">
        <div>
          <h1 className="text-6xl font-black tracking-tighter italic uppercase mb-2">Global Oversight</h1>
          <p className="text-primary font-black uppercase text-xs tracking-[0.4em]">Ecosystem Level 4 Clearance Restricted Area</p>
        </div>
        <Button variant="outline" size="lg" className="gap-3 rounded-2xl font-black border-primary/20 shadow-xl" onClick={() => { fetchData(); checkHealth(); }}>
          <RefreshCw size={18} /> SYNC ECOSYSTEM
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted/40 p-2 rounded-[2.5rem] w-fit border border-border/50 backdrop-blur-md mx-4">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={cn(
              "rounded-[2rem] gap-3 px-10 font-black text-xs uppercase tracking-widest transition-all h-14",
              activeTab === tab.id ? "shadow-2xl shadow-primary/30 bg-card text-primary" : "text-muted-foreground"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-12 px-4">
        {activeTab === 'users' && (
           <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="bg-primary/5 border-none shadow-xl rounded-[3rem] p-10 group">
                   <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mb-4">Total Population</p>
                   <p className="text-6xl font-black tracking-tighter group-hover:scale-110 transition-transform origin-left">{stats?.total_users || 0}</p>
                </Card>
                <Card className="bg-orange-500/5 border-none shadow-xl rounded-[3rem] p-10 group">
                   <p className="text-[10px] font-black uppercase text-orange-600 tracking-[0.3em] mb-4">Admin Units</p>
                   <p className="text-6xl font-black tracking-tighter text-orange-600 group-hover:scale-110 transition-transform origin-left">{stats?.admin_count || 0}</p>
                </Card>
                <Card className="bg-destructive/5 border-none shadow-xl rounded-[3rem] p-10 group">
                   <p className="text-[10px] font-black uppercase text-red-600 tracking-[0.3em] mb-4">Blacklisted</p>
                   <p className="text-6xl font-black tracking-tighter text-red-600 group-hover:scale-110 transition-transform origin-left">{users.filter(u => u.is_banned).length}</p>
                </Card>
              </div>

              <Card className="rounded-[3.5rem] shadow-2xl border-none overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-none h-20">
                      <TableHead className="pl-12 font-black uppercase text-[11px] tracking-widest">Entity Identity</TableHead>
                      <TableHead className="font-black uppercase text-[11px] tracking-widest">Clearance Level</TableHead>
                      <TableHead className="font-black uppercase text-[11px] tracking-widest">Integrity Status</TableHead>
                      <TableHead className="text-right pr-12 font-black uppercase text-[11px] tracking-widest">Terminal Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={cn("h-24 border-border/40 transition-colors", u.is_banned && "bg-destructive/5 opacity-80")}>
                        <TableCell className="pl-12">
                           <div className="flex flex-col">
                              <span className="font-black text-xl tracking-tighter uppercase">{u.username}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">UID: {u.id}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_admin ? "default" : "secondary"} className="rounded-xl font-black text-[10px] tracking-widest px-4 h-8 bg-primary/10 text-primary border-none">
                            {u.is_admin ? "SYSTEM ADMIN" : "CIVILIAN UNIT"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.is_banned ? (
                            <Badge variant="destructive" className="gap-2 rounded-xl font-black text-[10px] px-4 h-8"><Ban size={14}/> TERMINATED</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-2 rounded-xl border-green-500/20 text-green-600 font-black text-[10px] px-4 h-8 bg-green-500/5"><CheckCircle2 size={14}/> VERIFIED</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-12 space-x-3">
                          <Button variant="ghost" size="icon" className="w-14 h-14 rounded-[1.5rem] bg-muted/20 hover:bg-orange-500/20" title="Toggle Admin" onClick={() => toggleAdmin(u.id)}>
                            <Shield size={24} className={u.is_admin ? "text-orange-500" : "text-muted-foreground/30"} />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-14 h-14 rounded-[1.5rem] bg-muted/20 hover:bg-red-500/20" title={u.is_banned ? "Restore" : "Terminate"} onClick={() => toggleBan(u.id)}>
                            <Ban size={24} className={u.is_banned ? "text-red-600" : "text-muted-foreground/30"} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
           </div>
        )}

        {activeTab === 'tournaments' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tournaments.map(t => (
                <Card key={t.id} className="rounded-[3rem] border-none shadow-xl bg-card group p-10 space-y-6">
                   <div className="flex justify-between items-start">
                      <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-4 py-1 rounded-full uppercase">{t.sport}</Badge>
                      {t.is_public ? <Globe size={18} className="text-green-500" /> : <Lock size={18} className="text-orange-500" />}
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tighter uppercase italic">{t.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Creator ID: {t.creator_id}</p>
                   </div>
                   <div className="pt-4 border-t border-border/50 flex gap-3">
                      <Button asChild className="flex-1 rounded-2xl font-black h-12">
                         <Link to={`/tournament/${t.id}`}>ENTER ARENA</Link>
                      </Button>
                      <Button variant="ghost" className="w-12 h-12 p-0 text-destructive hover:bg-red-500/10 rounded-2xl">
                         <Trash2 size={20}/>
                      </Button>
                   </div>
                </Card>
              ))}
           </div>
        )}

        {activeTab === 'infrastructure' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((s) => (
                <Card key={s.id} className="rounded-[3rem] border-none shadow-xl bg-card overflow-hidden relative group">
                  <div className={cn(
                    "absolute top-0 left-0 w-full h-1.5 transition-all duration-500",
                    s.status === 'healthy' ? "bg-green-500" : "bg-red-600 animate-pulse"
                  )} />
                  <CardContent className="p-10 space-y-8">
                    <div className="flex justify-between items-start">
                       <div className="w-16 h-16 bg-muted/40 rounded-[1.5rem] flex items-center justify-center">
                          <Activity size={32} className={cn(s.status === 'healthy' ? "text-green-500" : "text-red-500")} />
                       </div>
                       {s.status === 'healthy' ? <SignalHigh size={20} className="text-green-500" /> : <SignalLow size={20} className="text-red-500 animate-ping" />}
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-xl font-black uppercase tracking-tight italic">{s.name}</h3>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.url}</p>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                       <Badge variant="outline" className={cn(
                         "h-8 px-4 rounded-full font-black text-[10px] tracking-widest uppercase border-none",
                         s.status === 'healthy' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                       )}>
                          {s.status}
                       </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        )}

        {activeTab === 'reports' && (
           <div className="max-w-3xl mx-auto py-40 text-center space-y-8 bg-muted/10 rounded-[4rem] border-4 border-dashed border-border/50">
              <div className="w-32 h-32 bg-muted/50 rounded-[3rem] mx-auto flex items-center justify-center shadow-inner">
                 <Shield size={64} className="text-muted-foreground/20" />
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-black text-muted-foreground/40 uppercase tracking-tighter italic">Sector Secured</p>
                <p className="text-xs font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">No community incident reports detected</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
