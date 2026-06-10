import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, Plus, Search, ChevronRight, Shield, 
  Globe, Lock, Trophy, UserPlus, LogOut, ArrowRight,
  ShieldCheck, AlertCircle, Info, Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TeamsListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sport: 'football',
    description: '',
    is_public: true
  });
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        teamService.listPublic(),
        teamService.listMy()
      ]);
      setTeams(allRes.data || []);
      setMyTeams(myRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await teamService.create(formData);
      setCreateOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create squad');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await teamService.join(inviteCode);
      setJoinOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join squad');
    }
  };

  const handleLeave = async (team) => {
    const isOwner = team.owner_id === user?.user_id || user?.is_admin;
    const msg = isOwner 
      ? 'Are you sure you want to DISBAND this squad? All data will be lost.' 
      : 'Are you sure you want to LEAVE this squad?';
      
    if (!window.confirm(msg)) return;
    
    try {
      if (isOwner) {
        await teamService.disband(team.id);
      } else {
        await teamService.leave(team.id);
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const hasTeam = myTeams.length > 0;
  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-12 text-center font-black animate-pulse text-muted-foreground uppercase tracking-[0.3em]">SYNCHRONIZING SQUAD REGISTRY...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter uppercase italic">Squad Command</h1>
          <p className="text-primary font-black uppercase text-xs tracking-[0.4em]">Global Personnel Roster & Deployment</p>
        </div>

        <div className="flex gap-4">
           {hasTeam ? (
              <div className="flex gap-3">
                 <Button asChild size="lg" className="h-16 px-10 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 group">
                    <Link to={`/team/${myTeams[0].id}`}>
                       ENTER SQUAD HUD <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                 </Button>
                 <Button onClick={() => handleLeave(myTeams[0])} variant="ghost" size="lg" className="h-16 px-6 rounded-2xl font-black text-red-500 hover:bg-red-500/10 gap-3">
                    <LogOut size={18} /> {myTeams[0].owner_id === user?.user_id ? 'DISBAND' : 'LEAVE'}
                 </Button>
              </div>
           ) : (
              <div className="flex gap-3">
                 <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                       <Button size="lg" className="h-16 px-10 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 group">
                          <Plus className="group-hover:rotate-90 transition-transform duration-300" /> ENLIST SQUAD
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden max-w-xl">
                       <DialogHeader className="bg-primary p-12 text-primary-foreground">
                          <DialogTitle className="text-4xl font-black uppercase italic tracking-tighter">Enlist New Squad</DialogTitle>
                          <DialogDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Establish your command in the ecosystem</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleCreate} className="p-12 space-y-8">
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Squad Designation</Label>
                                <Input placeholder="E.g. VANGUARD ONE" className="h-14 rounded-2xl font-black text-lg uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                             </div>
                             <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Operational Discipline</Label>
                                <Select value={formData.sport} onValueChange={v => setFormData({...formData, sport: v})}>
                                   <SelectTrigger className="h-14 rounded-2xl font-black uppercase tracking-tight text-md">
                                      <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent className="rounded-2xl border-none shadow-2xl">
                                      <SelectItem value="football" className="font-bold uppercase tracking-tight py-3">Football Operations</SelectItem>
                                      <SelectItem value="cricket" className="font-bold uppercase tracking-tight py-3">Cricket Operations</SelectItem>
                                      <SelectItem value="basketball" className="font-bold uppercase tracking-tight py-3">Basketball Operations</SelectItem>
                                   </SelectContent>
                                </Select>
                             </div>
                             <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50">
                                <div className="space-y-0.5">
                                   <Label className="font-black uppercase text-[10px] tracking-widest pl-1">Public Registry</Label>
                                   <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Listed in global search for recruitment</p>
                                </div>
                                <Switch checked={formData.is_public} onCheckedChange={v => setFormData({...formData, is_public: v})} />
                             </div>
                          </div>
                          <DialogFooter>
                             <Button type="submit" className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20">INITIATE ENLISTMENT</Button>
                          </DialogFooter>
                       </form>
                    </DialogContent>
                 </Dialog>

                 <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                    <DialogTrigger asChild>
                       <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl font-black border-primary/20 gap-3 shadow-xl">
                          <UserPlus size={18} /> JOIN SQUAD
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden max-w-md">
                       <DialogHeader className="bg-muted p-12">
                          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">Transmission Check</DialogTitle>
                          <DialogDescription className="font-bold uppercase text-[10px] tracking-widest mt-2 text-muted-foreground/60">Enter the authorized squad invite code</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleJoin} className="p-12 space-y-8">
                          <div className="space-y-2">
                             <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Invite Vector Code</Label>
                             <Input placeholder="E.g. A9F2X3" className="h-16 rounded-2xl font-black text-2xl tracking-[0.5em] text-center uppercase" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required />
                          </div>
                          <DialogFooter>
                             <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg">VERIFY & DEPLOY</Button>
                          </DialogFooter>
                       </form>
                    </DialogContent>
                 </Dialog>
              </div>
           )}
        </div>
      </header>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
         <Card className="bg-primary/5 border-none shadow-xl rounded-[3rem] p-10 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Users size={120} /></div>
            <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-3">Active Units</p>
            <p className="text-6xl font-black tracking-tighter uppercase italic">{teams.length}</p>
         </Card>
         <Card className="bg-muted border-none shadow-xl rounded-[3rem] p-10 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Globe size={120} /></div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] mb-3">Open Recruits</p>
            <p className="text-6xl font-black tracking-tighter uppercase italic text-muted-foreground">{teams.filter(t => t.is_public).length}</p>
         </Card>
         <Card className="bg-orange-500/5 border-none shadow-xl rounded-[3rem] p-10 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy size={120} /></div>
            <p className="text-[10px] font-black uppercase text-orange-600 tracking-[0.4em] mb-3">My Standing</p>
            <p className="text-6xl font-black tracking-tighter uppercase italic text-orange-600">{hasTeam ? 'ENLISTED' : 'STANDBY'}</p>
         </Card>
      </div>

      <div className="space-y-8 px-4">
         <div className="relative max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={24} />
            <Input 
              placeholder="Search Global Squad Registry..." 
              className="pl-16 h-16 rounded-[2rem] bg-card border-none font-black text-lg shadow-2xl focus:ring-4 focus:ring-primary/10 transition-all uppercase tracking-tight"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(t => (
               <Card key={t.id} className="group relative overflow-hidden rounded-[3.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-card p-10 space-y-8">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10 group-hover:bg-primary transition-colors" />
                  
                  <div className="flex justify-between items-start">
                     <Badge variant="outline" className="font-black text-[9px] tracking-widest uppercase border-primary/20 text-primary px-3 py-1 rounded-full">{t.sport}</Badge>
                     {t.is_public ? <Globe size={18} className="text-green-500/30 group-hover:text-green-500 transition-colors" /> : <Lock size={18} className="text-orange-500/30" />}
                  </div>

                  <div className="space-y-2">
                     <h3 className="text-3xl font-black uppercase tracking-tighter italic group-hover:text-primary transition-colors leading-none">{t.name}</h3>
                     <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Commanded by ID: {t.owner_id}</p>
                  </div>

                  <p className="text-muted-foreground font-bold text-sm leading-relaxed line-clamp-3 italic opacity-60 group-hover:opacity-100 transition-opacity">
                     {t.description || 'No operational brief provided for this squad.'}
                  </p>

                  <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                     <div className="flex -space-x-3 overflow-hidden">
                        {[1, 2, 3].map(i => (
                           <div key={i} className="w-10 h-10 rounded-full bg-muted border-4 border-card flex items-center justify-center font-black text-[10px] text-muted-foreground shadow-lg">?</div>
                        ))}
                     </div>
                     <Button asChild size="sm" className="rounded-xl font-black shadow-lg shadow-primary/20 h-10 px-6 transform group-hover:-translate-y-0.5 transition-all">
                        <Link to={`/team/${t.id}`}>INTEL HUD</Link>
                     </Button>
                  </div>
               </Card>
            ))}
         </div>

         {filtered.length === 0 && (
            <div className="py-40 text-center space-y-6 bg-muted/10 rounded-[4rem] border-4 border-dashed border-border/50">
               <AlertCircle size={64} className="mx-auto text-muted-foreground/10" />
               <p className="text-muted-foreground font-black uppercase text-xs tracking-[0.4em]">No squads detected in registry</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default TeamsListPage;
