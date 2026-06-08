import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { 
  Clock, Play, Pause, Square, AlertCircle, 
  Trophy, User, ChevronRight, Activity, 
  Flag, Award, Zap, History, Send, ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const MatchOfficiatingPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      setMatch(res.data);
      setSeconds(res.data.current_time || 0);
      if (res.data.status === 'live') setIsActive(true);
      
      const tRes = await api.get(`/tournaments/${res.data.tournament_id}`);
      setTournament(tRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          const nextS = s + 1;
          // Football logic check: auto-pause at half time?
          if (tournament?.sport === 'football' && nextS === 45 * 60) {
            handleStatus('paused');
          }
          return nextS;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, tournament?.sport]);

  const handleStatus = async (status) => {
    try {
      await api.put(`/matches/${id}/status`, { status });
      setIsActive(status === 'live');
      await syncTime();
      fetchMatch();
    } catch (err) {
      alert('Status update failed');
    }
  };

  const handleEvent = async (type, teamId, value = 1) => {
    try {
      await api.post(`/matches/${id}/events`, {
        type,
        team_id: teamId,
        value,
        minute: Math.floor(seconds / 60)
      });
      fetchMatch();
    } catch (err) {
      console.error(err);
    }
  };

  const syncTime = async () => {
    await api.put(`/matches/${id}/timer`, { time: seconds });
  };

  if (!match || !tournament) return <div className="p-12 text-center animate-pulse font-black text-muted-foreground">LOADING DATA...</div>;

  const t1 = tournament.teams?.find(t => t.id === match.team1_id);
  const t2 = tournament.teams?.find(t => t.id === match.team2_id);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/tournament/${match.tournament_id}`}><ChevronRight className="rotate-180" size={16}/> Back</Link>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Badge variant="outline" className="uppercase font-black border-primary/20 text-primary">{tournament.sport}</Badge>
        <span className="font-bold text-muted-foreground tracking-widest uppercase text-xs">Officiating Control</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <Card className="bg-[#0f172a] text-white border-none shadow-2xl relative overflow-hidden rounded-[3rem]">
               <div className="absolute top-0 left-0 bg-blue-600 w-full h-1.5" />
               <CardContent className="p-16 text-center">
                  <div className="flex justify-around items-center gap-12">
                     <div className="space-y-6 flex-1 max-w-[200px]">
                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] shadow-2xl mx-auto flex items-center justify-center border border-white/10">
                           <span className="text-4xl font-black text-blue-500">{t1?.name?.[0]}</span>
                        </div>
                        <h2 className="text-2xl font-black truncate">{t1?.name || "TBD"}</h2>
                        <Badge className="bg-white/10 text-white/40 border-none">HOME</Badge>
                     </div>

                     <div className="space-y-10">
                        <div className="text-9xl font-black tracking-tighter flex items-center gap-10 leading-none">
                           <span className={cn(match.team1_score > match.team2_score && "text-blue-500")}>{match.team1_score}</span>
                           <span className="text-white/10">:</span>
                           <span className={cn(match.team2_score > match.team1_score && "text-blue-500")}>{match.team2_score}</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-3xl py-4 px-10 rounded-[2rem] border border-white/10 inline-flex items-center gap-6">
                           <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                           <span className="text-5xl font-mono font-black tracking-widest">{formatTime(seconds)}</span>
                        </div>
                     </div>

                     <div className="space-y-6 flex-1 max-w-[200px]">
                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] shadow-2xl mx-auto flex items-center justify-center border border-white/10">
                           <span className="text-4xl font-black text-blue-500">{t2?.name?.[0]}</span>
                        </div>
                        <h2 className="text-2xl font-black truncate">{t2?.name || "TBD"}</h2>
                        <Badge className="bg-white/10 text-white/40 border-none">AWAY</Badge>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Card className="rounded-[2.5rem] shadow-xl border-border/50">
                  <CardHeader>
                     <CardTitle className="text-xl font-black flex items-center gap-3"><Zap size={24} className="text-yellow-500" /> ENGINE CONTROLS</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                     <Button onClick={() => handleStatus('live')} variant={match.status === 'live' ? 'default' : 'outline'} className="gap-2 font-black h-16 text-lg rounded-2xl">
                        <Play size={20} fill="currentColor"/> START
                     </Button>
                     <Button onClick={() => handleStatus('paused')} variant={match.status === 'paused' ? 'secondary' : 'outline'} className="gap-2 font-black h-16 text-lg rounded-2xl">
                        <Pause size={20} fill="currentColor"/> PAUSE
                     </Button>
                     <Button onClick={() => handleStatus('completed')} variant="destructive" className="col-span-2 gap-3 font-black h-20 text-xl rounded-2xl shadow-xl shadow-red-500/20 transform hover:-translate-y-1 transition-all">
                        <Square size={20} fill="currentColor"/> FINALIZE MATCH
                     </Button>
                  </CardContent>
               </Card>

               <Card className="rounded-[2.5rem] shadow-xl border-border/50">
                  <CardHeader>
                     <CardTitle className="text-xl font-black flex items-center gap-3"><Activity size={24} className="text-primary" /> LIVE TELEMETRY</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                     {/* Team 1 Controls */}
                     <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">{t1?.name}</p>
                        <div className="flex flex-wrap gap-2">
                           {tournament.sport === 'football' && (
                             <>
                               <Button size="lg" className="flex-1 font-black rounded-xl h-12" onClick={() => handleEvent('goal', match.team1_id)}>GOAL</Button>
                               <Button size="lg" variant="outline" className="w-12 h-12 p-0 border-yellow-500 bg-yellow-500/10 text-yellow-600 rounded-xl" onClick={() => handleEvent('card_yellow', match.team1_id)}><ShieldAlert size={18}/></Button>
                               <Button size="lg" variant="outline" className="w-12 h-12 p-0 border-red-500 bg-red-500/10 text-red-600 rounded-xl" onClick={() => handleEvent('card_red', match.team1_id)}><ShieldAlert size={18}/></Button>
                             </>
                           )}
                           {tournament.sport === 'cricket' && (
                             <>
                               <Button variant="outline" className="font-black rounded-xl" onClick={() => handleEvent('run', match.team1_id, 1)}>+1</Button>
                               <Button variant="outline" className="font-black rounded-xl" onClick={() => handleEvent('run', match.team1_id, 4)}>+4</Button>
                               <Button variant="outline" className="font-black rounded-xl" onClick={() => handleEvent('run', match.team1_id, 6)}>+6</Button>
                               <Button className="bg-red-600 font-black rounded-xl" onClick={() => handleEvent('wicket', match.team1_id)}>WKT</Button>
                             </>
                           )}
                           {tournament.sport === 'basketball' && (
                             <>
                               <Button variant="outline" className="font-black rounded-xl h-12 flex-1" onClick={() => handleEvent('point_2', match.team1_id, 2)}>+2 PTS</Button>
                               <Button className="font-black rounded-xl h-12 flex-1" onClick={() => handleEvent('point_3', match.team1_id, 3)}>+3 PTS</Button>
                             </>
                           )}
                        </div>
                     </div>
                     {/* Team 2 Controls */}
                     <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">{t2?.name}</p>
                        <div className="flex flex-wrap gap-2">
                           {tournament.sport === 'football' && (
                             <>
                               <Button size="lg" className="flex-1 font-black rounded-xl h-12" onClick={() => handleEvent('goal', match.team2_id)}>GOAL</Button>
                               <Button size="lg" variant="outline" className="w-12 h-12 p-0 border-yellow-500 bg-yellow-500/10 text-yellow-600 rounded-xl" onClick={() => handleEvent('card_yellow', match.team2_id)}><ShieldAlert size={18}/></Button>
                               <Button size="lg" variant="outline" className="w-12 h-12 p-0 border-red-500 bg-red-500/10 text-red-600 rounded-xl" onClick={() => handleEvent('card_red', match.team2_id)}><ShieldAlert size={18}/></Button>
                             </>
                           )}
                           {tournament.sport === 'cricket' && (
                             <>
                               <Button variant="outline" className="font-black rounded-xl" onClick={() => handleEvent('run', match.team2_id, 1)}>+1</Button>
                               <Button variant="outline" className="font-black rounded-xl" onClick={() => handleEvent('run', match.team2_id, 4)}>+4</Button>
                               <Button variant="outline" className="font-black rounded-xl" onClick={() => handleEvent('run', match.team2_id, 6)}>+6</Button>
                               <Button className="bg-red-600 font-black rounded-xl" onClick={() => handleEvent('wicket', match.team2_id)}>WKT</Button>
                             </>
                           )}
                           {tournament.sport === 'basketball' && (
                             <>
                               <Button variant="outline" className="font-black rounded-xl h-12 flex-1" onClick={() => handleEvent('point_2', match.team2_id, 2)}>+2 PTS</Button>
                               <Button className="font-black rounded-xl h-12 flex-1" onClick={() => handleEvent('point_3', match.team2_id, 3)}>+3 PTS</Button>
                             </>
                           )}
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>

         <Card className="h-full max-h-[800px] flex flex-col rounded-[2.5rem] shadow-xl border-border/50 bg-muted/10">
            <CardHeader className="border-b bg-card rounded-t-[2.5rem]">
               <CardTitle className="text-xl font-black flex items-center gap-3 tracking-tight"><History size={20} className="text-primary"/> SQUAD LOGS</CardTitle>
               <CardDescription className="font-bold">Real-time incident feed</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
               <div className="divide-y border-b border-border/50">
                  {match.events?.sort((a,b) => b.id - a.id).map(e => (
                    <div key={e.id} className="p-6 flex gap-5 items-start hover:bg-card transition-all group">
                       <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                          e.type === 'goal' || e.type === 'point_3' ? "bg-green-500/10 text-green-600" : 
                          e.type.includes('card_red') ? "bg-red-500/10 text-red-600" :
                          e.type.includes('card_yellow') ? "bg-yellow-500/10 text-yellow-600" :
                          "bg-blue-500/10 text-blue-600"
                       )}>
                          {e.type === 'goal' ? <Flag size={20} /> : <Activity size={20} />}
                       </div>
                       <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="text-base font-black tracking-tight capitalize truncate">
                             {e.type.replace('_', ' ')} <span className="text-muted-foreground/30 mx-1">/</span> {tournament.teams?.find(t => t.id === e.team_id)?.name}
                          </p>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                <Clock size={12}/> {e.minute}'
                             </div>
                             {e.value > 1 && <Badge variant="outline" className="text-[9px] font-black px-1.5 border-primary/20 text-primary">+{e.value} POINTS</Badge>}
                          </div>
                       </div>
                    </div>
                  ))}
                  {(!match.events || match.events.length === 0) && (
                    <div className="py-32 text-center space-y-6">
                       <div className="w-16 h-16 bg-muted/50 rounded-3xl mx-auto flex items-center justify-center border border-dashed">
                          <History size={24} className="text-muted-foreground/40" />
                       </div>
                       <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">No incidents reported</p>
                    </div>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};

export default MatchOfficiatingPage;
