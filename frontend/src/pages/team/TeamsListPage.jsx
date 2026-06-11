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
      ? 'Are you sure you want to disband this squad?' 
      : 'Are you sure you want to leave this squad?';
      
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
    <div className="min-h-[400px] flex items-center justify-center font-medium text-muted-foreground animate-pulse">
      Syncing Squad Registry...
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Squad Hub</h1>
          <p className="text-muted-foreground">Manage your enlistment and join global competition units.</p>
        </div>

        <div className="flex flex-wrap gap-3">
           {!hasTeam ? (
              <>
                 <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                    <DialogTrigger asChild>
                       <Button variant="outline" className="gap-2">
                          Join Squad
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                       <DialogHeader>
                          <DialogTitle>Join a Squad</DialogTitle>
                          <DialogDescription>Enter the invitation code provided by the squad commander.</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleJoin} className="space-y-6 pt-4">
                          <div className="space-y-2">
                             <Label>Invite Code</Label>
                             <Input 
                                placeholder="E.G. A9F2X3" 
                                className="h-12 text-center text-xl font-bold tracking-widest" 
                                value={inviteCode} 
                                onChange={e => setInviteCode(e.target.value)} 
                                required 
                             />
                          </div>
                          <DialogFooter>
                             <Button type="submit" className="w-full">Join Unit</Button>
                          </DialogFooter>
                       </form>
                    </DialogContent>
                 </Dialog>

                 <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                       <Button className="gap-2">
                          <Plus size={18} /> Enlist New Squad
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                       <DialogHeader>
                          <DialogTitle>Enlist New Squad</DialogTitle>
                          <DialogDescription>Establish a new operational unit and invite members.</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleCreate} className="space-y-6 pt-4">
                          <div className="space-y-4">
                             <div className="space-y-2">
                                <Label>Squad Name</Label>
                                <Input placeholder="e.g. Vanguard One" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                             </div>
                             <div className="space-y-2">
                                <Label>Discipline</Label>
                                <Select value={formData.sport} onValueChange={v => setFormData({...formData, sport: v})}>
                                   <SelectTrigger><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="football">Football</SelectItem>
                                      <SelectItem value="cricket">Cricket</SelectItem>
                                      <SelectItem value="basketball">Basketball</SelectItem>
                                   </SelectContent>
                                </Select>
                             </div>
                             <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                                <div className="space-y-0.5">
                                   <Label>Public Registry</Label>
                                   <p className="text-xs text-muted-foreground italic">Listed for global recruitment.</p>
                                </div>
                                <Switch checked={formData.is_public} onCheckedChange={v => setFormData({...formData, is_public: v})} />
                             </div>
                          </div>
                          <DialogFooter>
                             <Button type="submit" className="w-full">Initialize Squad</Button>
                          </DialogFooter>
                       </form>
                    </DialogContent>
                 </Dialog>
              </>
           ) : (
             <div className="flex items-center gap-3 px-4 py-2 rounded-xl border bg-card shadow-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={16} />
                </div>
                <div className="mr-4">
                  <p className="text-xs font-medium text-muted-foreground leading-none mb-1">Active Unit</p>
                  <p className="text-sm font-bold leading-none">{myTeams[0].name}</p>
                </div>
                <div className="flex gap-2">
                   <Button asChild size="sm" variant="secondary" className="h-8 px-3">
                      <Link to={`/team/${myTeams[0].id}`}>Dashboard</Link>
                   </Button>
                   <Button size="sm" variant="ghost" className="h-8 px-3 text-destructive hover:bg-destructive/10" onClick={() => handleLeave(myTeams[0])}>
                      Leave
                   </Button>
                </div>
             </div>
           )}
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <Card className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Active Units</p>
            <p className="text-3xl font-bold tracking-tight">{teams.length}</p>
         </Card>
         <Card className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Open Registry</p>
            <p className="text-3xl font-bold tracking-tight">{teams.filter(t => t.is_public).length}</p>
         </Card>
         <Card className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Your Status</p>
            <p className="text-3xl font-bold tracking-tight">{hasTeam ? 'Enlisted' : 'Standby'}</p>
         </Card>
      </div>

      <div className="space-y-6">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search global squad registry..." 
              className="pl-10 h-11 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(t => (
               <Card key={t.id} className="group hover:shadow-lg transition-all flex flex-col border-muted/60 overflow-hidden">
                  <CardContent className="p-6 flex flex-col h-full">
                     <div className="flex justify-between items-start mb-4">
                        <Badge variant="secondary" className="capitalize">{t.sport}</Badge>
                        <div className="text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">
                           {t.is_public ? <Globe size={16} /> : <Lock size={16} />}
                        </div>
                     </div>

                     <div className="space-y-1 mb-4">
                        <h3 className="text-xl font-bold tracking-tight line-clamp-1">{t.name}</h3>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                           CMD: {String(t.owner_id || '').split('-')[0]}
                        </p>
                     </div>

                     <p className="text-sm text-muted-foreground line-clamp-3 mb-8 flex-1">
                        {t.description || 'No operational brief provided.'}
                     </p>

                     <div className="pt-4 border-t flex items-center justify-between">
                        <div className="flex -space-x-2">
                           {[1, 2, 3].map(i => (
                              <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">?</div>
                           ))}
                        </div>
                        <Button asChild variant="ghost" size="sm" className="group/btn hover:bg-transparent px-0 font-semibold">
                           <Link to={`/team/${t.id}`} className="flex items-center gap-2">
                              Access Intel <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                           </Link>
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>

         {filtered.length === 0 && (
            <div className="py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
               <AlertCircle size={48} className="mx-auto text-muted-foreground/30 mb-4" />
               <h3 className="text-lg font-semibold text-muted-foreground">No squads logged</h3>
               <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-1">Try adjusting your search filters or enlist a new squad to begin.</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default TeamsListPage;
