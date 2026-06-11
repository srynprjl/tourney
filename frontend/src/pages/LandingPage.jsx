import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, 
  Zap, 
  Users, 
  BarChart3, 
  Shield, 
  Globe, 
  ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LandingPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background border-b">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" strokeWidth={2.5} />
            <span className="font-bold text-xl tracking-tighter uppercase">TourneyPro</span>
          </div>
          <nav className="hidden lg:flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.3em]">
            <a href="#features" className="hover:opacity-50 transition-opacity">Features</a>
            <a href="#arenas" className="hover:opacity-50 transition-opacity">Arenas</a>
            <a href="#stats" className="hover:opacity-50 transition-opacity">Stats</a>
            {user && <Link to="/dashboard" className="hover:opacity-50 transition-opacity">Dashboard</Link>}
          </nav>
          <div className="flex items-center gap-8">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-[0.2em]" onClick={logout}>Logout</Button>
                <Link to="/dashboard">
                  <Button size="sm" className="px-6 text-[10px] font-black uppercase tracking-[0.2em]">Dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Login</Link>
                <Link to="/register">
                  <Button size="sm" className="px-6 text-[10px] font-black uppercase tracking-[0.2em]">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 overflow-hidden border-b">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 bg-primary animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-60">Season 2026 // Registration Open</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-12 uppercase leading-[0.9]">
              Tournament<br />Management.
            </h1>
            <p className="text-xl text-muted-foreground mb-16 leading-tight max-w-xl font-medium">
              Create, manage, and scale your football tournaments with professional-grade tools. Built for organizers, loved by players.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to={user ? "/dashboard" : "/register"}>
                <Button size="lg" className="px-12 font-bold tracking-widest uppercase">
                  {user ? "Dashboard" : "Start Tournament"}
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-12 font-bold tracking-widest uppercase">Browse</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l">
            {[
              {
                id: "01",
                title: "Easy Organizing",
                desc: "Create knockout or group stage tournaments in seconds with our automated scheduler."
              },
              {
                id: "02",
                title: "Live Scores",
                desc: "Real-time match updates and instant table standings for all participants."
              },
              {
                id: "03",
                title: "Team Control",
                desc: "Powerful tools for roster control, player registration, and team stats."
              },
              {
                id: "04",
                title: "Full Statistics",
                desc: "Track every goal, assist, and card with exhaustive historical data."
              }
            ].map((feature, i) => (
              <div key={i} className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                <span className="text-xs font-bold tracking-widest opacity-30 group-hover:opacity-100 transition-opacity mb-8 block">{feature.id}</span>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-4">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-tight font-medium uppercase tracking-wider opacity-80">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Arenas */}
      <section id="arenas" className="py-32 border-t">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold mb-6 tracking-tighter uppercase">Active Arenas</h2>
              <p className="text-muted-foreground uppercase text-xs font-bold tracking-[0.2em]">Join one of our active football leagues and prove your skill on the global stage.</p>
            </div>
            <Link to="/tournaments">
              <Button variant="outline" className="px-10 font-bold uppercase tracking-widest">
                All Arenas
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Shadow Protocol",
                status: "Ongoing",
                players: "2,400",
                img: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=1000"
              },
              {
                title: "Nexus Clash",
                status: "Finals",
                players: "512",
                img: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1000"
              },
              {
                title: "Rally Masters",
                status: "Qualifiers",
                players: "128",
                img: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=1000"
              }
            ].map((arena, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-square relative overflow-hidden mb-8 grayscale hover:grayscale-0 transition-all duration-700">
                  <img 
                    src={arena.img} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={arena.title}
                  />
                  <div className="absolute top-0 left-0 p-4">
                    <span className="bg-background text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1">{arena.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">{arena.players} Players</p>
                  <h3 className="text-2xl font-bold uppercase tracking-tighter">{arena.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-32 border-t">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { label: "Matches Played", value: "12,400+" },
              { label: "Total Players", value: "850k+" },
              { label: "Active Today", value: "45.2k" },
              { label: "Prize Money", value: "$2.4M" }
            ].map((stat, i) => (
              <div key={i} className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">{stat.label}</p>
                <p className="text-5xl font-bold tracking-tighter uppercase">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 border-t bg-background">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
            <div className="md:col-span-6 space-y-10">
              <div className="flex items-center gap-2">
                <Trophy className="w-8 h-8" strokeWidth={2.5} />
                <span className="font-bold text-3xl tracking-tighter uppercase">TourneyPro</span>
              </div>
              <p className="text-muted-foreground max-w-sm leading-tight font-medium uppercase text-xs tracking-widest opacity-60">
                The next generation of tournament management. Professional, reliable, and competitive.
              </p>
            </div>
            <div className="md:col-span-3 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">App</h4>
              <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                <li><a href="#" className="hover:opacity-50 transition-opacity">Arenas</a></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Squads</a></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Stats</a></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Docs</a></li>
              </ul>
            </div>
            <div className="md:col-span-3 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Legal</h4>
              <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                <li><a href="#" className="hover:opacity-50 transition-opacity">Privacy</a></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Terms</a></li>
                <li><a href="#" className="hover:opacity-50 transition-opacity">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 gap-4">
            <p>© 2026 TourneyPro Cloud. All rights reserved.</p>
            <p>Distributed worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
