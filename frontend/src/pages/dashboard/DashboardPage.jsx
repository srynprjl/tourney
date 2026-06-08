import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Plus, Trophy, Users, Calendar, Activity, 
  ChevronRight, Search, Filter, LayoutGrid, List,
  ShieldCheck, Globe, Lock, Gamepad2, Settings2
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
import { Separator } from "@/components/ui/separator";

const DashboardPage = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'mine'
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'knockout',
    sport: 'football',
    mode: 'self',
    max_teams: 8,
    is_public: true,
    is_double: false,
    group_count: 2,
    teams_per_group: 4,
    promote_count: 2
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tournaments', {
        ...formData,
        max_teams: parseInt(formData.max_teams),
        group_count: parseInt(formData.group_count),
        teams_per_group: parseInt(formData.teams_per_group),
        promote_count: parseInt(formData.promote_count)
      });
      setOpen(false);
      fetchTournaments();
    } catch (err) {
      alert('Failed to create tournament');
    }
  };

  const filtered = tournaments
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter(t => activeTab === 'all' ? true : t.creator_id === user?.user_id);

  if (loading) return <div className="p-12 text-center animate-pulse font-black text-muted-foreground uppercase tracking-widest">CONNECTING TO ARENA NETWORK...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter italic uppercase">Arena Center</h1>
          <p className="text-primary font-black uppercase text-xs tracking-[0.4em]">Global Competition Deployment Hub</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-16 px-10 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 group">
              <Plus className="group-hover:rotate-90 transition-transform duration-300" /> 
              INITIALIZE ARENA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl rounded-[3rem] p-0 border-none shadow-2xl overflow-hidden">
            <DialogHeader className="bg-primary p-12 text-primary-foreground">
               <DialogTitle className="text-4xl font-black uppercase italic tracking-tighter">Arena Configuration</DialogTitle>
               <DialogDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Specify operational parameters for deployment</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="p-12 space-y-10 max-h-[70vh] overflow-y-auto bg-card">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2 col-span-full">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Arena Designation</Label>
                    <Input placeholder="E.g. WORLD CUP PRO 2026" className="h-14 rounded-2xl font-black text-xl uppercase italic shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Operational Discipline</Label>
                    <Select value={formData.sport} onValueChange={v => setFormData({...formData, sport: v})}>
                       <SelectTrigger className="h-14 rounded-2xl font-black uppercase tracking-tight text-md"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="football" className="font-bold uppercase py-3">Football</SelectItem>
                          <SelectItem value="cricket" className="font-bold uppercase py-3">Cricket</SelectItem>
                          <SelectItem value="basketball" className="font-bold uppercase py-3">Basketball</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Engine Type</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                       <SelectTrigger className="h-14 rounded-2xl font-black uppercase tracking-tight text-md"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="knockout" className="font-bold uppercase py-3">Knockout (Direct)</SelectItem>
                          <SelectItem value="group" className="font-bold uppercase py-3">Group Phase (Hybrid)</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Management Protocol</Label>
                    <Select value={formData.mode} onValueChange={v => setFormData({...formData, mode: v})}>
                       <SelectTrigger className="h-14 rounded-2xl font-black uppercase tracking-tight text-md"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="self" className="font-bold uppercase py-3">Organizer Controlled</SelectItem>
                          <SelectItem value="registration" className="font-bold uppercase py-3">Public Enlistment</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Combatant Capacity</Label>
                    <Input type="number" className="h-14 rounded-2xl font-black text-xl shadow-inner" value={formData.max_teams} onChange={e => setFormData({...formData, max_teams: e.target.value})} />
                  </div>

                  {formData.type === 'group' && (
                     <>
                        <div className="space-y-2">
                           <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Sector Count (Groups)</Label>
                           <Input type="number" className="h-14 rounded-2xl font-black text-xl shadow-inner" value={formData.group_count} onChange={e => setFormData({...formData, group_count: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Units per Sector</Label>
                           <Input type="number" className="h-14 rounded-2xl font-black text-xl shadow-inner" value={formData.teams_per_group} onChange={e => setFormData({...formData, teams_per_group: e.target.value})} />
                        </div>
                        <div className="space-y-2 col-span-full">
                           <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-1">Promotion Protocol (Units to Advance)</Label>
                           <Input type="number" className="h-14 rounded-2xl font-black text-xl shadow-inner" value={formData.promote_count} onChange={e => setFormData({...formData, promote_count: e.target.value})} />
                        </div>
                     </>
                  )}

                  <div className="flex items-center justify-between p-6 bg-muted/40 rounded-3xl border border-border/50 col-span-full">
                     <div className="space-y-1">
                        <Label className="font-black uppercase text-[11px] tracking-widest">Public Deployment</Label>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Visible in global sector search</p>
                     </div>
                     <Switch checked={formData.is_public} onCheckedChange={v => setFormData({...formData, is_public: v})} className="data-[state=checked]:bg-primary" />
                  </div>
               </div>

               <DialogFooter>
                  <Button type="submit" className="w-full h-16 rounded-2xl font-black text-xl shadow-2xl shadow-primary/30 transform hover:-translate-y-1 transition-all uppercase italic">Initiate Arena Deployment</Button>
               </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-card/60 backdrop-blur-xl p-8 rounded-[3.5rem] border border-border/50 mx-4 shadow-xl">
         <div className="flex gap-2 bg-muted/40 p-1.5 rounded-[1.5rem] border border-border/40">
            <Button variant={activeTab === 'all' ? 'default' : 'ghost'} className={cn("rounded-2xl font-black text-[10px] uppercase tracking-widest px-8", activeTab === 'all' && "shadow-lg bg-card text-primary")} onClick={() => setActiveTab('all')}>Global Arenas</Button>
            <Button variant={activeTab === 'mine' ? 'default' : 'ghost'} className={cn("rounded-2xl font-black text-[10px] uppercase tracking-widest px-8", activeTab === 'mine' && "shadow-lg bg-card text-primary")} onClick={() => setActiveTab('mine')}>My Arenas</Button>
         </div>

         <div className="relative w-full md:max-w-md">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={22} />
            <Input 
              placeholder="Filter Arenas..." 
              className="pl-16 h-14 rounded-[1.5rem] bg-muted/30 border-none font-black text-lg shadow-inner focus:ring-4 focus:ring-primary/10 uppercase tracking-tighter"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      <div className={cn(
        "grid gap-10 px-4",
        view === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {filtered.map(t => (
          <Card key={t.id} className="group relative overflow-hidden rounded-[3.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-card p-10 space-y-8">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10 group-hover:bg-primary transition-colors" />
            
            <div className="flex justify-between items-start">
               <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-full">
                  {t.sport}
               </Badge>
               <div className="flex gap-3">
                  {t.creator_id === user?.user_id && <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[9px] uppercase px-3">Owner</Badge>}
                  {t.is_public ? <Globe size={18} className="text-green-500/30 group-hover:text-green-500 transition-colors"/> : <Lock size={18} className="text-orange-500/30 group-hover:text-orange-500 transition-colors"/>}
               </div>
            </div>

            <div className="space-y-2">
               <h2 className="text-3xl font-black tracking-tighter uppercase italic group-hover:text-primary transition-colors leading-none">{t.name}</h2>
               <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground opacity-40">Sector-ID: {t.id.split('-')[0]}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8">
               <div className="bg-muted/30 p-5 rounded-[2rem] space-y-1 group-hover:bg-primary/5 transition-colors">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Users size={12}/> Slots</p>
                  <p className="text-2xl font-black italic">{t.max_teams} Units</p>
               </div>
               <div className="bg-muted/30 p-5 rounded-[2rem] space-y-1 group-hover:bg-primary/5 transition-colors">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Activity size={12}/> Engine</p>
                  <p className="text-2xl font-black capitalize italic">{t.type}</p>
               </div>
            </div>

            <Button asChild className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/10 group-hover:shadow-primary/30 transition-all transform group-hover:-translate-y-1">
               <Link to={`/tournament/${t.id}`}>ACCESS ARENA <ChevronRight size={22} className="ml-1 group-hover:translate-x-1 transition-transform"/></Link>
            </Button>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
         <div className="py-48 text-center space-y-8 bg-muted/10 rounded-[4rem] border-4 border-dashed border-border/50 mx-4">
            <Trophy size={80} className="mx-auto text-muted-foreground/10 animate-pulse" />
            <div className="space-y-2">
               <p className="text-4xl font-black text-muted-foreground/30 uppercase tracking-tighter italic">No Signals Detected</p>
               <p className="text-xs font-bold text-muted-foreground/20 uppercase tracking-[0.5em]">Adjust filters or initialize a new arena</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default DashboardPage;
