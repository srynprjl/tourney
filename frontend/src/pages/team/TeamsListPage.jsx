import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, Plus, Search, Shield, 
  Globe, Lock, Trophy, UserPlus, LogOut, ArrowRight,
  AlertCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sport: 'football',
    description: '',
    is_public: true
  });
  const [inviteCode, setInviteCode] = useState('');

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

  useEffect(() => {
    fetchData();
  }, []);

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
      ? 'DISBAND SQUAD?' 
      : 'LEAVE SQUAD?';
      
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

  if (loading) return (
    <div className="p-24 text-center font-black uppercase tracking-[0.5em] animate-pulse">
      Syncing Global Squad Registry...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-l-8 border-foreground pl-12 py-4">
        <div className="space-y-4">
          <Badge variant="outline">Sector: Personnel Management</Badge>
          <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none">Squad Hub</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic">Global Roster Enrollment & Operations</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
           {hasTeam ? (
              <div className="flex gap-4">
                 <Button asChild className="h-20 px-10 gap-4 font-black uppercase italic">
                    <Link to={`/team/${myTeams[0].id}`} className="flex items-center gap-4">
                       Enter Squad HUD <ArrowRight size={24} strokeWidth={3} />
                    </Link>
                 </Button>
                 <Button onClick={() => handleLeave(myTeams[0])} variant="outline" className="h-20 px-8 border-2 font-black italic">
                    {myTeams[0].owner_id === user?.user_id ? 'DISBAND' : 'LEAVE'}
                 </Button>
              </div>
           ) : (
              <div className="flex gap-4">
                 <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                       <Button className="h-20 px-10 gap-4 font-black uppercase italic">
                          <Plus size={24} strokeWidth={3} /> ENLIST SQUAD
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                       <DialogHeader className="bg-foreground text-background -m-12 p-12 mb-12">
                          <DialogTitle className="text-5xl uppercase">Enlist Unit</DialogTitle>
                          <DialogDescription className="text-background/60 font-black uppercase tracking-widest mt-2">Establish new operational squad</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleCreate} className="space-y-12">
                          <div className="space-y-8">
                             <div className="space-y-4">
                                <Label>Squad Designation</Label>
                                <Input placeholder="E.G. VANGUARD_ONE" className="h-16 text-2xl italic" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                             </div>
                             <div className="space-y-4">
                                <Label>Operational Discipline</Label>
                                <Select value={formData.sport} onValueChange={v => setFormData({...formData, sport: v})}>
                                   <SelectTrigger className="h-16"><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="football">Football</SelectItem>
                                      <SelectItem value="cricket">Cricket</SelectItem>
                                      <SelectItem value="basketball">Basketball</SelectItem>
                                   </SelectContent>
                                </Select>
                             </div>
                             <div className="flex items-center justify-between p-8 bg-secondary border-2 border-foreground">
                                <div className="space-y-2">
                                   <Label>Public Registry</Label>
                                   <p className="text-[10px] opacity-60 font-black uppercase tracking-widest italic">Listed for global recruitment</p>
                                </div>
                                <Switch checked={formData.is_public} onCheckedChange={v => setFormData({...formData, is_public: v})} />
                             </div>
                          </div>
                          <DialogFooter>
                             <Button type="submit" className="w-full h-24 text-2xl uppercase italic">Initiate Enlistment</Button>
                          </DialogFooter>
                       </form>
                    </DialogContent>
                 </Dialog>

                 <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                    <DialogTrigger asChild>
                       <Button variant="outline" className="h-20 px-10 border-2 font-black italic">
                          JOIN_UNIT
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                       <DialogHeader>
                          <DialogTitle>Vector Access</DialogTitle>
                          <DialogDescription>Input authorized squad invitation code</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleJoin} className="space-y-12 py-8">
                          <div className="space-y-4">
                             <Label>Invite Vector Code</Label>
                             <Input placeholder="A9F2X3" className="h-20 text-4xl text-center tracking-[0.3em]" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required />
                          </div>
                          <DialogFooter>
                             <Button type="submit" className="w-full h-20 text-xl italic uppercase">Verify & Link</Button>
                          </DialogFooter>
                       </form>
                    </DialogContent>
                 </Dialog>
              </div>
           )}
        </div>
      </header>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-foreground border-2 border-foreground">
         <Card className="border-none p-12 bg-background rounded-none">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-6">Active Units</p>
            <p className="text-7xl font-black tracking-tighter uppercase italic leading-none">{teams.length}</p>
         </Card>
         <Card className="border-none p-12 bg-background rounded-none">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-6">Open Registry</p>
            <p className="text-7xl font-black tracking-tighter uppercase italic leading-none">{teams.filter(t => t.is_public).length}</p>
         </Card>
         <Card className="border-none p-12 bg-background rounded-none">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-6">Unit Status</p>
            <p className="text-5xl font-black tracking-tighter uppercase italic leading-none">{hasTeam ? 'ENLISTED' : 'STANDBY'}</p>
         </Card>
      </div>

      <div className="space-y-12">
         <div className="relative">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 opacity-20" size={24} />
            <Input 
              placeholder="Search Global Squad Registry..." 
              className="pl-20 h-24 border-2 border-foreground italic text-2xl tracking-tighter placeholder:opacity-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 bg-foreground border-2 border-foreground">
            {filtered.map(t => (
               <Card key={t.id} className="border-none p-12 bg-background rounded-none hover:bg-muted transition-colors group">
                  <div className="flex flex-col h-full space-y-8">
                     <div className="flex justify-between items-start">
                        <Badge variant="outline">{t.sport}</Badge>
                        <div className="opacity-20 group-hover:opacity-100 transition-opacity">
                           {t.is_public ? <Globe size={18} /> : <Lock size={18} />}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-[0.9]">{t.name}</h3>
                        <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.3em]">Operator: {String(t.owner_id || '').split('-')[0]}</p>
                     </div>

                     <p className="text-sm font-bold uppercase leading-tight italic opacity-60 group-hover:opacity-100 transition-opacity line-clamp-3">
                        {t.description || 'No operational brief available.'}
                     </p>

                     <div className="pt-8 mt-auto border-t-2 border-foreground/10 flex items-center justify-between">
                        <div className="flex -space-x-3 grayscale opacity-30 group-hover:opacity-100 group-hover:grayscale-0 transition-all">
                           {[1, 2, 3].map(i => (
                              <div key={i} className="w-10 h-10 border-2 border-foreground bg-muted flex items-center justify-center font-black text-[10px]">?</div>
                           ))}
                        </div>
                        <Button asChild className="h-14 border-2 border-foreground font-black uppercase italic tracking-tighter">
                           <Link to={`/team/${t.id}`}>ACCESS_INTEL</Link>
                        </Button>
                     </div>
                  </div>
               </Card>
            ))}
         </div>

         {filtered.length === 0 && (
            <div className="py-48 text-center border-4 border-foreground border-dashed">
               <AlertCircle size={80} strokeWidth={1} className="mx-auto opacity-10" />
               <p className="text-3xl font-black uppercase tracking-tighter italic opacity-20">No Squads Logged</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default TeamsListPage;
