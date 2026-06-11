import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { teamService } from '@/services/teamService';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, Users, Activity, Target, 
  TrendingUp, Award, ChevronRight,
  Shield, Zap, Radio, Globe
} from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalArenas: 0,
    myArenas: 0,
    myTeams: 0,
    activeMatches: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [tournamentsRes, myTeamsRes] = await Promise.all([
        api.get('/tournaments'),
        teamService.listMy()
      ]);

      const tournaments = tournamentsRes.data || [];
      const myTeams = myTeamsRes.data || [];
      const myArenas = tournaments.filter(t => t.creator_id === user?.user_id).length;
      
      let activeMatches = 0;
      tournaments.forEach(t => {
        if (t.matches) {
          activeMatches += t.matches.filter(m => m.status === 'ongoing').length;
        }
      });

      setStats({
        totalArenas: tournaments.length,
        myArenas: myArenas,
        myTeams: myTeams.length,
        activeMatches: activeMatches,
        recentActivity: tournaments.slice(0, 5)
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="p-24 text-center font-black uppercase tracking-[0.5em] animate-pulse">
      Initializing Operational Data Hub...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-l-8 border-foreground pl-12 py-4">
        <div className="space-y-4">
          <Badge variant="outline">Sector: Core Command</Badge>
          <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none">Command Center</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Strategic Overview & System Vitals // VER 2.4.0</p>
        </div>
        <div className="flex items-center gap-6 border-2 border-foreground p-6 bg-secondary">
          <div className="p-4 border-2 border-foreground bg-background">
            <Shield size={32} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Operator Active</p>
            <p className="text-2xl font-black uppercase italic tracking-tighter">{user?.username}</p>
          </div>
        </div>
      </header>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 bg-foreground border-2 border-foreground">
        <StatCard title="Global Arenas" value={stats.totalArenas} icon={Globe} description="Active sectors" />
        <StatCard title="Deployments" value={stats.myArenas} icon={Zap} description="Arenas controlled" />
        <StatCard title="Combat Units" value={stats.myTeams} icon={Users} description="Squads enlisted" />
        <StatCard title="Live Signals" value={stats.activeMatches} icon={Radio} description="Ongoing matches" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <section className="space-y-8">
            <div className="flex justify-between items-end border-b-2 border-foreground pb-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                <TrendingUp size={32} /> Matrix Status
              </h2>
              <Link to="/tournaments" className="text-[10px] font-black uppercase tracking-widest hover:line-through flex items-center gap-2">
                View All Sectors <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="p-8">
                <CardHeader className="p-0 border-none mb-6">
                  <div className="w-16 h-16 border-2 border-foreground flex items-center justify-center mb-6">
                    <Trophy size={32} strokeWidth={2.5} />
                  </div>
                  <CardTitle>Championship Potential</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm font-bold uppercase leading-relaxed mb-8 opacity-60">
                    Your units are currently engaged in {stats.myTeams} different sectors. Maintain tactical excellence.
                  </p>
                  <Button className="w-full" asChild>
                    <Link to="/teams">Enlist Squads</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="p-8">
                <CardHeader className="p-0 border-none mb-6">
                  <div className="w-16 h-16 border-2 border-foreground flex items-center justify-center mb-6">
                    <Target size={32} strokeWidth={2.5} />
                  </div>
                  <CardTitle>Tactical Deployment</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm font-bold uppercase leading-relaxed mb-8 opacity-60">
                    Operational clearance confirmed for {stats.myArenas} arena deployments. Total global network: {stats.totalArenas}.
                  </p>
                  <Button variant="outline" className="w-full border-2" asChild>
                    <Link to="/tournaments">Arena Command</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-12">
          <section className="space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-4 border-b-2 border-foreground pb-4">
              <Activity size={24} strokeWidth={2.5} /> Signals
            </h2>
            <div className="space-y-1 bg-foreground border-2 border-foreground">
              {stats.recentActivity.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4 p-4 bg-background hover:bg-muted transition-colors border-b-2 last:border-b-0 border-foreground">
                  <div className="w-12 h-12 border-2 border-foreground flex items-center justify-center shrink-0">
                    <Radio size={20} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Signal Detected</p>
                    <p className="font-black uppercase tracking-tight truncate italic">{activity.name}</p>
                    <Badge variant="secondary">{activity.sport}</Badge>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <div className="p-12 text-center bg-background">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Zero Activity in Sector</p>
                </div>
              )}
            </div>
          </section>

          <Card className="bg-foreground text-background p-8 border-none">
             <div className="space-y-6">
                <Award size={48} strokeWidth={2.5} />
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Elite Clearance</h3>
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-70">Operator status allows for unrestricted arena orchestration and unit deployment.</p>
                <div className="pt-4 space-y-2">
                   <div className="h-1 bg-background/20 w-full overflow-hidden">
                      <div className="h-full bg-background w-3/4" />
                   </div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span>Tier: 07</span>
                      <span>Next Level: 85%</span>
                   </div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, description }) => (
  <Card className="border-none bg-background p-8 group hover:bg-muted transition-colors rounded-none">
    <div className="flex flex-col gap-8">
      <div className="w-14 h-14 border-2 border-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.3em]">{title}</p>
        <p className="text-6xl font-black tracking-tighter italic leading-none">{value}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{description}</p>
      </div>
    </div>
  </Card>
);

export default DashboardPage;
