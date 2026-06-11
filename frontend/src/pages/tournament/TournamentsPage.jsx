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
      <div className="p-24 text-center font-black uppercase tracking-[0.5em] animate-pulse">
        Connecting to Arena Network Clusters...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-l-8 border-foreground pl-12 py-4">
        <div className="space-y-4">
          <Badge variant="outline">Sector: Arena Command</Badge>
          <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none">
            Arena Hub
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic">
            Global Competition Deployment & Orchestration
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="h-20 px-10 border-2 gap-4 font-black"
              >
                <KeyRound size={24} strokeWidth={2.5} /> JOIN CODE
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Secure Access</DialogTitle>
                <DialogDescription>
                  Input authorized vector code for entry
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinByCode} className="space-y-12 py-8">
                <div className="space-y-4">
                  <Label>Arena Vector Code</Label>
                  <Input
                    placeholder="X9F2B3"
                    className="h-20 text-4xl text-center tracking-[0.3em]"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full h-20 text-xl italic uppercase"
                  >
                    Verify & Link
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="h-20 px-10 gap-4 font-black uppercase italic italic"
              >
                <Plus size={24} strokeWidth={3} /> INITIALIZE ARENA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader className="bg-foreground text-background -m-12 p-12 mb-12">
                <DialogTitle className="text-5xl">Configure Arena</DialogTitle>
                <DialogDescription className="text-background/60 font-black uppercase tracking-widest mt-2">
                  Specify operational parameters
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4 col-span-full">
                    <Label>Arena Designation</Label>
                    <Input
                      placeholder="E.G. GLOBAL_CHAMPIONSHIP_2026"
                      className="h-16 text-2xl italic"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Operational Discipline</Label>
                    <Select
                      value={formData.sport}
                      onValueChange={(v) =>
                        setFormData({ ...formData, sport: v })
                      }
                    >
                      <SelectTrigger className="h-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="football">Football</SelectItem>
                        <SelectItem value="cricket">Cricket</SelectItem>
                        <SelectItem value="basketball">Basketball</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Engine Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, type: v })
                      }
                    >
                      <SelectTrigger className="h-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="knockout">
                          Knockout (Direct)
                        </SelectItem>
                        <SelectItem value="group">
                          Group Phase (Hybrid)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Unit Capacity</Label>
                    <Input
                      type="number"
                      className="h-16 text-xl"
                      value={formData.max_teams}
                      onChange={(e) =>
                        setFormData({ ...formData, max_teams: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Entry Fee (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-16 text-xl"
                      value={formData.entry_fee}
                      onChange={(e) =>
                        setFormData({ ...formData, entry_fee: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-8 bg-secondary border-2 border-foreground col-span-full">
                    <div className="space-y-2">
                      <Label>Public Deployment</Label>
                      <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">
                        Visible to all active operators
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_public}
                      onCheckedChange={(v) =>
                        setFormData({ ...formData, is_public: v })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full h-24 text-2xl uppercase italic tracking-tighter"
                  >
                    Initiate Deployment Protocol
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-1 border-2 border-foreground bg-foreground">
        <div className="flex flex-1 gap-1 bg-foreground">
          <button
            className={cn(
              "flex-1 p-8 text-[10px] font-black uppercase tracking-[0.4em] transition-colors",
              activeTab === "all"
                ? "bg-background text-foreground"
                : "bg-foreground text-background hover:bg-muted/10",
            )}
            onClick={() => setActiveTab("all")}
          >
            Global Network
          </button>
          <button
            className={cn(
              "flex-1 p-8 text-[10px] font-black uppercase tracking-[0.4em] transition-colors",
              activeTab === "mine"
                ? "bg-background text-foreground"
                : "bg-foreground text-background hover:bg-muted/10",
            )}
            onClick={() => setActiveTab("mine")}
          >
            My Sectors
          </button>
        </div>

        <div className="relative flex-[1.5] bg-background">
          <Search
            className="absolute left-8 top-1/2 -translate-y-1/2 opacity-20"
            size={24}
          />
          <Input
            placeholder="Search Signal Data..."
            className="pl-20 h-24 border-none text-2xl italic tracking-tighter placeholder:opacity-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 bg-foreground border-2 border-foreground">
        {filtered.map((t) => (
          <Card
            key={t.id}
            className="border-none p-12 group hover:bg-muted transition-colors rounded-none"
          >
            <div className="flex flex-col h-full space-y-12">
              <div className="flex justify-between items-start">
                <Badge variant="outline">{t.sport}</Badge>
                <div className="flex gap-4 opacity-20 group-hover:opacity-100 transition-opacity">
                  {t.creator_id === user?.user_id && (
                    <Badge className="bg-foreground text-background border-none">
                      Owner
                    </Badge>
                  )}
                  {t.is_public ? <Globe size={20} /> : <Lock size={20} />}
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.9]">
                  {t.name}
                </h2>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 italic">
                  Sector-ID: {String(t.id || "").split("-")[0]}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 bg-foreground border-2 border-foreground mt-8">
                <div className="bg-background p-6 space-y-1">
                  <p className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
                    <Users size={12} /> Capacity
                  </p>
                  <p className="text-2xl font-black italic uppercase">
                    {t.max_teams}
                  </p>
                </div>
                <div className="bg-background p-6 space-y-1">
                  <p className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12} /> Protocol
                  </p>
                  <p className="text-2xl font-black italic uppercase">
                    {t.type}
                  </p>
                </div>
              </div>

              <Button
                asChild
                className="w-full h-20 text-lg uppercase italic tracking-tighter border-2 border-foreground"
              >
                <Link
                  to={`/tournament/${t.id}`}
                  className="flex items-center justify-between px-8"
                >
                  Access Link <ChevronRight size={24} strokeWidth={3} />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-48 text-center border-4 border-foreground border-dashed">
          <div className="space-y-8 max-w-md mx-auto">
            <Trophy size={80} strokeWidth={1} className="mx-auto opacity-10" />
            <div className="space-y-2">
              <p className="text-4xl font-black uppercase tracking-tighter italic opacity-30">
                Zero Signals
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-20 italic">
                Initialize a new arena sector to begin operations
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentsPage;
