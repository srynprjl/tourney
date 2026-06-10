import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { teamService } from '@/services/teamService';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, Users, Activity, Target, 
  TrendingUp, Award, Calendar, ChevronRight,
  Shield, Zap, Radio, Globe
} from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
      
      // Calculate some derived stats
      const myArenas = tournaments.filter(t => t.creator_id === user?.user_id).length;
      
      // Get some "active matches" - this is speculative, we'll just count total matches in my tournaments
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
        recentActivity: tournaments.slice(0, 5) // Just use latest tournaments as "activity"
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse font-black text-muted-foreground uppercase tracking-widest">SYNCHRONIZING OPERATIONAL DATA...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <header className="px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter italic uppercase">Command Center</h1>
            <p className="text-primary font-black uppercase text-xs tracking-[0.4em]">Strategic Overview & Ecosystem Vitals</p>
          </div>
          <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-3xl border border-border/50">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Operator</p>
              <p className="text-lg font-black uppercase italic tracking-tighter">{user?.username}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
        <StatCard 
          title="Global Arenas" 
          value={stats.totalArenas} 
          icon={Globe} 
          color="text-blue-500" 
          bg="bg-blue-500/5"
          description="Active competition sectors"
        />
        <StatCard 
          title="My Deployments" 
          value={stats.myArenas} 
          icon={Zap} 
          color="text-orange-500" 
          bg="bg-orange-500/5"
          description="Arenas under your control"
        />
        <StatCard 
          title="Active Units" 
          value={stats.myTeams} 
          icon={Users} 
          color="text-green-500" 
          bg="bg-green-500/5"
          description="Squads in your roster"
        />
        <StatCard 
          title="Live Sessions" 
          value={stats.activeMatches} 
          icon={Radio} 
          color="text-red-500" 
          bg="bg-red-500/5"
          description="Ongoing combat operations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-4">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                <TrendingUp className="text-primary" /> Performance Matrix
              </h2>
              <Button variant="link" className="font-black uppercase text-xs tracking-widest text-primary" asChild>
                <Link to="/tournaments">View All Arenas <ChevronRight size={14} /></Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[3rem] border-none shadow-xl bg-card p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Trophy size={28} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight italic">Championship Potential</h3>
                  <p className="text-muted-foreground font-medium text-sm">Your squads are currently participating in {stats.myTeams} different competition sectors. Maintain operational excellence.</p>
                </div>
                <Button className="mt-8 rounded-2xl font-black uppercase tracking-widest h-14 shadow-lg shadow-primary/20" asChild>
                  <Link to="/teams">Manage Roster</Link>
                </Button>
              </Card>

              <Card className="rounded-[3rem] border-none shadow-xl bg-card p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-600">
                    <Target size={28} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight italic">Tactical Deployment</h3>
                  <p className="text-muted-foreground font-medium text-sm">You have successfully deployed {stats.myArenas} arenas. The ecosystem currently hosts {stats.totalArenas} active competition sectors.</p>
                </div>
                <Button variant="outline" className="mt-8 rounded-2xl font-black uppercase tracking-widest h-14 border-primary/20" asChild>
                  <Link to="/tournaments">Arena Hub</Link>
                </Button>
              </Card>
            </div>
          </section>
        </div>

        {/* Sidebar Activity Area */}
        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-4">
              <Activity className="text-primary" size={20} /> Latest Signals
            </h2>
            <div className="space-y-4">
              {stats.recentActivity.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors">
                  <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center text-primary shrink-0 border border-border/50">
                    <Radio size={18} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">New Arena Detected</p>
                    <p className="font-black uppercase tracking-tight truncate italic">{activity.name}</p>
                    <div className="flex items-center gap-2">
                       <Badge variant="secondary" className="text-[8px] font-black uppercase px-2 py-0 h-4 bg-primary/10 text-primary border-none">{activity.sport}</Badge>
                       <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Vector-0{idx+1}</span>
                    </div>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Silence in Sector</p>
                </div>
              )}
            </div>
          </section>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary p-8 text-primary-foreground">
             <div className="space-y-4">
                <Award size={40} className="mb-2" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Elite Status</h3>
                <p className="text-primary-foreground/70 font-bold text-xs uppercase tracking-widest leading-relaxed">Your operational clearance allows for unlimited arena deployment and squad enlistment.</p>
                <div className="pt-4 flex items-center gap-4">
                   <div className="h-2 flex-1 bg-primary-foreground/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-foreground w-3/4" />
                   </div>
                   <span className="text-[10px] font-black">Level 07</span>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg, description }) => (
  <Card className="rounded-[2.5rem] border-none shadow-xl bg-card p-8 group hover:-translate-y-1 transition-all duration-300">
    <div className="flex flex-col gap-6">
      <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg", bg, color)}>
        <Icon size={32} />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">{title}</p>
        <p className="text-5xl font-black tracking-tighter italic">{value}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 mt-2">{description}</p>
      </div>
    </div>
  </Card>
);

export default DashboardPage;
