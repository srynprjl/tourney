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
    <div className="min-h-[400px] flex items-center justify-center font-bold tracking-tighter text-2xl animate-pulse uppercase">
      Connecting to Telemetry...
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">System Overview</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">Console</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">Operator ID</p>
            <p className="text-sm font-bold uppercase tracking-widest">{user?.username}</p>
          </div>
          <div className="w-12 h-12 border flex items-center justify-center">
            <Shield size={20} strokeWidth={2.5} />
          </div>
        </div>
      </header>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l">
        <StatCard title="Total Arenas" value={stats.totalArenas} id="01" trend="+2 NEW" />
        <StatCard title="My Deployments" value={stats.myArenas} id="02" trend="ACTIVE" />
        <StatCard title="Active Squads" value={stats.myTeams} id="03" trend="ENGAGED" />
        <StatCard title="Live Matches" value={stats.activeMatches} id="04" trend="REAL-TIME" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40">System Matrix</h2>
              <Link to="/tournaments" className="text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">
                All Sectors →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20 block">Sector A-1</span>
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Championship Potential</h3>
                <p className="text-sm text-muted-foreground leading-tight font-medium uppercase tracking-wider opacity-80">
                  Your units are currently engaged in {stats.myTeams} different sectors. Maintain tactical excellence to climb the ranks.
                </p>
                <Button className="w-full font-black uppercase tracking-widest text-[10px] h-12" variant="outline" asChild>
                  <Link to="/teams">Manage Squads</Link>
                </Button>
              </div>

              <div className="space-y-6">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20 block">Sector A-2</span>
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Tactical Deployment</h3>
                <p className="text-sm text-muted-foreground leading-tight font-medium uppercase tracking-wider opacity-80">
                  Operational clearance confirmed for {stats.myArenas} arena deployments. Total global network expansion is currently at {stats.totalArenas}.
                </p>
                <Button variant="outline" className="w-full font-black uppercase tracking-widest text-[10px] h-12" asChild>
                  <Link to="/tournaments">Arena Command</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <section className="space-y-8">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 border-b pb-4">
              Activity Signals
            </h2>
            <div className="divide-y border-t border-b">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-4 hover:bg-accent/30 transition-colors group">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest">{activity.name}</p>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em]">{activity.sport}</p>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] border px-2 py-1">LIVE</span>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">No active signals.</p>
                </div>
              )}
            </div>
          </section>

          <div className="border p-10 space-y-8">
             <Award size={32} strokeWidth={2.5} />
             <div className="space-y-4">
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Elite Clearance</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest leading-tight opacity-60">Your operator status allows for unrestricted arena orchestration and unit deployment.</p>
             </div>
             <div className="space-y-3">
                <div className="h-[2px] bg-muted w-full overflow-hidden">
                   <div className="h-full bg-primary w-3/4" />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                   <span>Tier 07</span>
                   <span>85% COMPLETE</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, id, trend }) => (
  <div className="p-8 border-r border-b hover:bg-accent/30 transition-colors group">
    <div className="flex flex-col space-y-8">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">{id}</span>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity">{trend}</span>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{title}</p>
        <div className="text-5xl font-bold tracking-tighter uppercase">{value}</div>
      </div>
    </div>
  </div>
);

export default DashboardPage;
