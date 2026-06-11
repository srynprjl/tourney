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

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center font-bold tracking-tighter text-2xl animate-pulse uppercase">
      Loading Admin Panel...
    </div>
  );

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tournaments', label: 'Arenas', icon: Trophy },
    { id: 'infrastructure', label: 'Services', icon: HeartPulse },
    { id: 'reports', label: 'Reports', icon: AlertCircle },
  ];

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">System Administration</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">Admin</h1>
        </div>
        <Button 
          variant="outline" 
          className="px-8 font-black uppercase tracking-widest text-[10px] h-12" 
          onClick={() => { fetchData(); checkHealth(); }}
        >
          <RefreshCw size={14} className="mr-2" /> Refresh System
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={cn(
              "px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
              activeTab === tab.id ? "border-b-2 border-primary" : "opacity-30 hover:opacity-100"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-12">
        {activeTab === 'users' && (
           <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l">
                <div className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">01. Total Users</p>
                   <p className="text-6xl font-bold tracking-tighter uppercase leading-none">{stats?.total_users || 0}</p>
                </div>
                <div className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">02. Admins</p>
                   <p className="text-6xl font-bold tracking-tighter uppercase leading-none">{stats?.admin_count || 0}</p>
                </div>
                <div className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">03. Banned</p>
                   <p className="text-6xl font-bold tracking-tighter uppercase leading-none">{users.filter(u => u.is_banned).length}</p>
                </div>
              </div>

              <div className="border-t border-l">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background hover:bg-background border-none h-16">
                      <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest border-r border-b">Username</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest border-r border-b">Clearance</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest border-r border-b">Status</TableHead>
                      <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest border-r border-b">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={cn("h-20 border-none hover:bg-accent/30 transition-colors group", u.is_banned && "bg-destructive/5 opacity-80")}>
                        <TableCell className="pl-8 border-r border-b">
                           <div className="flex flex-col">
                              <span className="font-bold text-lg tracking-tighter uppercase">{u.username}</span>
                              <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">ID: {u.id}</span>
                           </div>
                        </TableCell>
                        <TableCell className="border-r border-b">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest border px-3 py-1",
                            u.is_admin ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"
                          )}>
                            {u.is_admin ? "ADMIN" : "USER"}
                          </span>
                        </TableCell>
                        <TableCell className="border-r border-b">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest border px-3 py-1",
                            u.is_banned ? "border-red-600 bg-red-600 text-white" : "border-muted text-muted-foreground"
                          )}>
                            {u.is_banned ? "BANNED" : "ACTIVE"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-8 border-r border-b space-x-2">
                          <Button variant="outline" size="sm" className="w-10 h-10 border rounded-none p-0" title="Toggle Admin" onClick={() => toggleAdmin(u.id)}>
                            <Shield size={14} className={u.is_admin ? "text-primary" : "text-muted-foreground/30"} />
                          </Button>
                          <Button variant="outline" size="sm" className="w-10 h-10 border rounded-none p-0" title={u.is_banned ? "Restore" : "Ban"} onClick={() => toggleBan(u.id)}>
                            <Ban size={14} className={u.is_banned ? "text-red-600" : "text-muted-foreground/30"} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
           </div>
        )}

        {activeTab === 'tournaments' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
              {tournaments.map((t, i) => (
                <div key={t.id} className="p-10 border-r border-b hover:bg-accent/30 transition-colors group flex flex-col h-full">
                   <div className="flex justify-between items-start mb-12">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Arena {String(i + 1).padStart(2, '0')}</span>
                      <div className="flex gap-4 opacity-40">
                         {t.is_public ? <Globe size={14} /> : <Lock size={14} />}
                      </div>
                   </div>
                   <div className="space-y-4 mb-16 flex-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">{t.sport} // {t.creator_id}</span>
                      <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none italic">{t.name}</h3>
                   </div>
                   <div className="flex gap-4">
                      <Button asChild variant="outline" className="flex-1 font-black uppercase tracking-widest text-[10px] h-12">
                         <Link to={`/tournament/${t.id}`}>Enter Arena</Link>
                      </Button>
                      <Button variant="outline" className="w-12 h-12 p-0 text-muted-foreground hover:text-red-600 border" onClick={() => { if(window.confirm('Delete Arena?')) alert('Operation restricted'); }}>
                         <Trash2 size={16}/>
                      </Button>
                   </div>
                </div>
              ))}
           </div>
        )}

        {activeTab === 'infrastructure' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
              {services.map((s, i) => (
                <div key={s.id} className="p-10 border-r border-b hover:bg-accent/30 transition-colors group relative overflow-hidden">
                  <div className={cn(
                    "absolute top-0 left-0 w-full h-[2px] transition-all duration-500",
                    s.status === 'healthy' ? "bg-primary" : "bg-red-600 animate-pulse"
                  )} />
                  <div className="space-y-12">
                    <div className="flex justify-between items-start">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Service {String(i + 1).padStart(2, '0')}</span>
                       {s.status === 'healthy' ? <SignalHigh size={14} className="opacity-40" /> : <SignalLow size={14} className="text-red-600 animate-pulse" />}
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold uppercase tracking-tighter leading-none">{s.name}</h3>
                       <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{s.url}</p>
                    </div>
                    <div className="pt-4 border-t">
                       <span className={cn(
                         "text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 border",
                         s.status === 'healthy' ? "border-primary bg-primary text-primary-foreground" : "border-red-600 text-red-600"
                       )}>
                          {s.status}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        )}

        {activeTab === 'reports' && (
           <div className="py-32 text-center border-t border-b">
              <h3 className="text-xs font-black uppercase tracking-[0.5em] opacity-30">No reports found</h3>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
