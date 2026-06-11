import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Trophy,
  Users,
  Activity,
  ChevronRight,
  Search,
  Globe,
  Lock,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TournamentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' or 'mine'
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    type: "knockout",
    sport: "football",
    mode: "self",
    max_teams: 8,
    is_public: true,
    is_double: false,
    group_count: 2,
    teams_per_group: 4,
    promote_count: 2,
    entry_fee: 0,
  });

  const fetchTournaments = async () => {
    try {
      const res = await api.get("/tournaments");
      setTournaments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tournaments", {
        ...formData,
        max_teams: parseInt(formData.max_teams),
        group_count: parseInt(formData.group_count),
        teams_per_group: parseInt(formData.teams_per_group),
        promote_count: parseInt(formData.promote_count),
        entry_fee: parseFloat(formData.entry_fee),
      });
      setOpen(false);
      fetchTournaments();
    } catch (err) {
      alert("Failed to create tournament");
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    try {
      const res = await api.get(`/tournaments/by-code/${joinCode}`);
      navigate(`/tournament/${res.data.id}`);
    } catch (err) {
      alert("Arena not found or code invalid");
    }
  };

  const filtered = tournaments
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter((t) =>
      activeTab === "all" ? true : t.creator_id === user?.user_id,
    );

  if (loading)
    return (
      <div className="min-h-[400px] flex items-center justify-center font-bold tracking-tighter text-2xl animate-pulse uppercase">
        Connecting to Arena Network...
      </div>
    );

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Deployment Matrix</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">Arenas</h1>
        </div>

        <div className="flex flex-wrap gap-4">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="px-8 font-black uppercase tracking-widest text-[10px] h-12">
                Join Sector
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-0 rounded-none p-10">
              <DialogHeader className="space-y-6">
                <DialogTitle className="text-3xl font-bold uppercase tracking-tighter">Secure Access</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Enter the authorized access code for the private arena.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinByCode} className="space-y-10 pt-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Arena Vector Code</Label>
                  <Input
                    placeholder="X9F2B3"
                    className="h-16 text-center text-3xl font-bold tracking-[0.3em] border-x-0 border-t-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full font-black uppercase tracking-widest text-[10px] h-14">Verify & Access</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="px-8 font-black uppercase tracking-widest text-[10px] h-12">
                Initialize Arena
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-0 rounded-none p-10">
              <DialogHeader className="space-y-6">
                <DialogTitle className="text-3xl font-bold uppercase tracking-tighter">New Deployment</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Configure operational parameters for the new tournament sector.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-8 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 col-span-full">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Arena Name</Label>
                    <Input
                      placeholder="E.G. GLOBAL CHAMPIONSHIP 2026"
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Discipline</Label>
                    <Select
                      value={formData.sport}
                      onValueChange={(v) =>
                        setFormData({ ...formData, sport: v })
                      }
                    >
                      <SelectTrigger className="rounded-none border-x-0 border-t-0 border-b shadow-none font-bold uppercase tracking-widest text-[10px] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border shadow-none">
                        <SelectItem value="football" className="text-[10px] font-bold uppercase tracking-widest">Football</SelectItem>
                        <SelectItem value="cricket" className="text-[10px] font-bold uppercase tracking-widest">Cricket</SelectItem>
                        <SelectItem value="basketball" className="text-[10px] font-bold uppercase tracking-widest">Basketball</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Format</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, type: v })
                      }
                    >
                      <SelectTrigger className="rounded-none border-x-0 border-t-0 border-b shadow-none font-bold uppercase tracking-widest text-[10px] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border shadow-none">
                        <SelectItem value="knockout" className="text-[10px] font-bold uppercase tracking-widest">Knockout</SelectItem>
                        <SelectItem value="group" className="text-[10px] font-bold uppercase tracking-widest">Group Phase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Unit Capacity</Label>
                    <Input
                      type="number"
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs"
                      value={formData.max_teams}
                      onChange={(e) =>
                        setFormData({ ...formData, max_teams: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Entry Fee (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs"
                      value={formData.entry_fee}
                      onChange={(e) =>
                        setFormData({ ...formData, entry_fee: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-6 border-b col-span-full">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Public Deployment</Label>
                      <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Visible to all active operators.</p>
                    </div>
                    <Switch
                      checked={formData.is_public}
                      onCheckedChange={(v) =>
                        setFormData({ ...formData, is_public: v })
                      }
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full font-black uppercase tracking-widest text-[10px] h-14">Deploy Sector</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-8 items-end">
         <div className="flex border-b w-full md:w-auto">
            <button
              className={cn(
                "px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                activeTab === "all" ? "border-b-2 border-primary" : "opacity-30 hover:opacity-100"
              )}
              onClick={() => setActiveTab("all")}
            >
              Global network
            </button>
            <button
              className={cn(
                "px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                activeTab === "mine" ? "border-b-2 border-primary" : "opacity-30 hover:opacity-100"
              )}
              onClick={() => setActiveTab("mine")}
            >
              My sectors
            </button>
         </div>

         <div className="relative flex-1 w-full">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={16} />
            <Input
              placeholder="FILTER BY NAME..."
              className="pl-8 h-12 border-x-0 border-t-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-[0.2em] text-[10px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
        {filtered.map((t, i) => (
          <div key={t.id} className="p-10 border-r border-b hover:bg-accent/30 transition-colors group flex flex-col h-full">
            <div className="flex justify-between items-start mb-12">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Arena {String(i + 1).padStart(2, '0')}</span>
               <div className="flex gap-4">
                  {t.creator_id === user?.user_id && (
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] border px-2 py-1">Owner</span>
                  )}
                  <div className="opacity-40">
                    {t.is_public ? <Globe size={14} /> : <Lock size={14} />}
                  </div>
               </div>
            </div>

            <div className="space-y-4 mb-16 flex-1">
               <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">{t.sport} // {t.type}</span>
               <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none">{t.name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em]">Capacity</p>
                  <p className="text-xl font-bold uppercase tracking-tighter">{t.max_teams} Units</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em]">Entry Fee</p>
                  <p className="text-xl font-bold uppercase tracking-tighter">${t.entry_fee}</p>
               </div>
            </div>

            <Button asChild variant="outline" className="w-full font-black uppercase tracking-widest text-[10px] h-12">
              <Link to={`/tournament/${t.id}`}>Enter Arena</Link>
            </Button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-32 text-center border-t border-b">
          <h3 className="text-xs font-black uppercase tracking-[0.5em] opacity-30">No active signals detected</h3>
        </div>
      )}
    </div>
  );
};

export default TournamentsPage;
