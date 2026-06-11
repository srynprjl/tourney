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
    <div className="flex flex-col min-h-screen bg-background font-sans selection:bg-foreground selection:text-background">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background border-b-2 border-foreground">
        <div className="container mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" strokeWidth={3} />
            <span className="font-black text-2xl uppercase tracking-tighter italic">TourneyPro</span>
          </div>
          <nav className="hidden lg:flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em]">
            <a href="#features" className="hover:line-through transition-all">01. Features</a>
            <a href="#arenas" className="hover:line-through transition-all">02. Arenas</a>
            <a href="#stats" className="hover:line-through transition-all">03. Performance</a>
            {user && <Link to="/dashboard" className="hover:line-through transition-all">04. Dashboard</Link>}
          </nav>
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-[10px] font-black uppercase tracking-widest hover:line-through">Dashboard</Link>
                <Button size="sm" className="px-8 italic" onClick={logout}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-widest hover:line-through">Login</Link>
                <Link to="/register">
                  <Button size="sm" className="px-8">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 border-b-2 border-foreground overflow-hidden">
        <div className="container mx-auto px-8">
          <div className="max-w-5xl">
            <Badge variant="outline" className="mb-8 py-1 px-4 text-xs">VER. 2026.4.1 // GLOBAL RELEASE</Badge>
            <h1 className="text-7xl md:text-[9rem] font-black leading-[0.85] tracking-tighter uppercase italic mb-12">
              Competitive<br />Scale<br />Absolute.
            </h1>
            <div className="flex flex-col md:flex-row items-start gap-12 mt-12">
              <p className="max-w-md text-lg font-bold leading-tight uppercase">
                High-performance microservice architecture for the next generation of digital combat orchestration. No latency. No compromise.
              </p>
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <Link to={user ? "/dashboard" : "/register"}>
                  <Button size="lg" className="w-full md:w-auto gap-4 group">
                    {user ? "Enter Command Center" : "Deploy Arena"} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                  </Button>
                </Link>
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Available worldwide // 99.9% Uptime SLA</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Large Background Glyph */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 select-none pointer-events-none opacity-5">
           <Trophy className="w-[800px] h-[800px]" strokeWidth={1} />
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-32 border-b-2 border-foreground">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
            <div className="sticky top-48">
              <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-8 leading-none">The Framework of Victory</h2>
              <p className="text-xl font-bold uppercase max-w-md mb-12">Systemic advantages for elite tournament management.</p>
              <div className="h-1 bg-foreground w-24" />
            </div>
            
            <div className="grid grid-cols-1 gap-1">
              {[
                {
                  id: "01",
                  icon: <Globe className="w-10 h-10" />,
                  title: "Distributed Core",
                  desc: "Decoupled microservices ensure operational continuity across global clusters."
                },
                {
                  id: "02",
                  icon: <Zap className="w-10 h-10" />,
                  title: "Instant Sync",
                  desc: "Sub-10ms synchronization via bidirectional WebSocket protocols."
                },
                {
                  id: "03",
                  icon: <Users className="w-10 h-10" />,
                  title: "Unit Command",
                  desc: "Granular control over team rosters and administrative clearance levels."
                },
                {
                  id: "04",
                  icon: <BarChart3 className="w-10 h-10" />,
                  title: "Data Matrix",
                  desc: "Exhaustive telemetry for every match event and player action."
                }
              ].map((feature) => (
                <div key={feature.id} className="group p-12 border-2 border-foreground hover:bg-foreground hover:text-background transition-all">
                  <div className="flex items-start justify-between mb-8">
                    <div className="p-4 border-2 border-current">
                      {feature.icon}
                    </div>
                    <span className="text-4xl font-black italic opacity-20 group-hover:opacity-100">{feature.id}</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tight mb-4">{feature.title}</h3>
                  <p className="text-sm font-bold uppercase leading-relaxed opacity-60 group-hover:opacity-100">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Arenas */}
      <section id="arenas" className="py-32 border-b-2 border-foreground bg-secondary">
        <div className="container mx-auto px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-12 border-l-8 border-foreground pl-8">
            <div className="max-w-2xl">
              <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Active Sectors</h2>
              <p className="text-lg font-bold uppercase">Real-time engagement across primary competition hubs.</p>
            </div>
            <Link to="/tournaments">
              <Button variant="outline" size="lg" className="border-2 font-black">
                Access All Sectors
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {[
              {
                title: "Shadow Protocol",
                status: "Operational",
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
              <Card key={i} className="group overflow-hidden border-2 border-foreground hover:scale-[1.02] transition-transform">
                <div className="aspect-[4/5] relative overflow-hidden bg-foreground">
                  <img 
                    src={arena.img} 
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                    alt={arena.title}
                  />
                  <div className="absolute inset-0 p-8 flex flex-col justify-between text-white mix-blend-difference">
                    <Badge className="w-fit bg-white text-black border-none font-black">{arena.status}</Badge>
                    <div className="space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">{arena.players} Units Engaged</p>
                       <h3 className="text-3xl font-black uppercase italic leading-none">{arena.title}</h3>
                    </div>
                  </div>
                </div>
                <CardContent className="p-0 border-t-2 border-foreground">
                   <Button variant="ghost" className="w-full h-16 text-[10px] uppercase tracking-[0.4em] font-black hover:bg-foreground hover:text-background">Join Operation</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-32 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-24">
            {[
              { label: "Operations Run", value: "12,400+" },
              { label: "Engaged Units", value: "850k+" },
              { label: "Active Signals", value: "45.2k" },
              { label: "Awarded Capital", value: "$2.4M" }
            ].map((stat, i) => (
              <div key={i} className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-50">{stat.label}</p>
                <p className="text-6xl font-black italic tracking-tighter leading-none">{stat.value}</p>
                <div className="h-0.5 bg-background w-full opacity-20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 border-t-2 border-foreground">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-24 mb-32">
            <div className="md:col-span-6 space-y-12">
              <div className="flex items-center gap-3">
                <Trophy className="w-10 h-10" strokeWidth={3} />
                <span className="font-black text-4xl uppercase tracking-tighter italic">TourneyPro</span>
              </div>
              <p className="text-3xl font-black uppercase italic leading-none max-w-lg">
                High-Performance Infrastructure for Global Competition.
              </p>
              <div className="flex gap-12">
                <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:line-through">Twitter</a>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:line-through">Discord</a>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:line-through">Github</a>
              </div>
            </div>
            <div className="md:col-span-3 space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Command</h4>
              <ul className="space-y-4 text-xs font-black uppercase tracking-widest">
                <li><a href="#" className="hover:line-through">Arenas</a></li>
                <li><a href="#" className="hover:line-through">Squads</a></li>
                <li><a href="#" className="hover:line-through">Telemetry</a></li>
                <li><a href="#" className="hover:line-through">API Matrix</a></li>
              </ul>
            </div>
            <div className="md:col-span-3 space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Organization</h4>
              <ul className="space-y-4 text-xs font-black uppercase tracking-widest">
                <li><a href="#" className="hover:line-through">Protocol</a></li>
                <li><a href="#" className="hover:line-through">Intelligence</a></li>
                <li><a href="#" className="hover:line-through">Compliance</a></li>
                <li><a href="#" className="hover:line-through">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t-2 border-foreground gap-8 text-[10px] font-black uppercase tracking-[0.3em]">
            <p>© 2026 TOURNEYPRO CLOUD OPERATIONALS // ALL RIGHTS RESERVED.</p>
            <div className="flex gap-12">
              <a href="#" className="hover:line-through">Privacy</a>
              <a href="#" className="hover:line-through">Security</a>
              <a href="#" className="hover:line-through">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
