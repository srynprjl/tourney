import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/services/api';
import { 
  User, Award, History, Globe, MapPin, 
  Trophy, MessageSquare, Shield, Share2, 
  ExternalLink, Calendar
} from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const PublicProfilePage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/profile/profiles/${username}`);
      setProfile(res.data);
      // Simulate history fetch
      setHistory([
        { id: 1, tournament: 'Pro League 2025', team: 'Warriors', result: 'Winner', date: '2025-12-20' },
        { id: 2, tournament: 'Summer Cup', team: 'Warriors', result: 'Quarterfinal', date: '2025-07-15' },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center font-black animate-pulse text-muted-foreground uppercase tracking-widest">DECRYPTING PLAYER IDENTITY...</div>;
  if (!profile) return <div className="p-12 text-center font-black text-red-500 uppercase">Player Not Found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      {/* Profile Header */}
      <header className="relative">
         <div className="h-48 bg-gradient-to-r from-primary/20 via-blue-600/10 to-transparent rounded-[3rem] border border-primary/10" />
         <div className="absolute -bottom-16 left-12 flex items-end gap-8">
            <div className="w-40 h-40 bg-card rounded-[2.5rem] p-2 border-4 border-background shadow-2xl overflow-hidden">
               <div className="w-full h-full bg-muted rounded-[2rem] flex items-center justify-center">
                  <User size={64} className="text-muted-foreground/30" />
               </div>
            </div>
            <div className="pb-4 space-y-2">
               <h1 className="text-5xl font-black tracking-tighter dark:text-white uppercase">{profile.username}</h1>
               <div className="flex gap-4 items-center text-muted-foreground font-bold">
                  <span className="flex items-center gap-1.5"><Globe size={16}/> {profile.location || 'Global'}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-primary font-black uppercase text-xs tracking-widest">Professional Competitor</span>
               </div>
            </div>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-24">
         {/* Sidebar Stats */}
         <div className="lg:col-span-4 space-y-8">
            <Card className="rounded-[2.5rem] shadow-xl border-border/50">
               <CardHeader>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Biography</CardTitle>
               </CardHeader>
               <CardContent>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                     {profile.bio || "No biography provided. This player prefers to let their results speak for themselves."}
                  </p>
               </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] shadow-xl border-border/50 bg-primary/5">
               <CardHeader>
                  <CardTitle className="text-xl font-black uppercase tracking-tight italic">Ecosystem Standing</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="font-bold text-muted-foreground">Approx. Winnings</span>
                     <span className="text-2xl font-black text-primary">$4,250</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="font-bold text-muted-foreground">Tournaments</span>
                     <span className="text-2xl font-black">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="font-bold text-muted-foreground">Global Rank</span>
                     <Badge className="font-black">TOP 5%</Badge>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Main Content */}
         <div className="lg:col-span-8 space-y-12">
            <section className="space-y-8">
               <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-600"><Award size={24}/></div>
                  Career Hall of Fame
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map(i => (
                    <Card key={i} className="rounded-3xl border-border/40 hover:border-primary/30 transition-all group overflow-hidden">
                       <CardContent className="p-8 text-center space-y-4">
                          <Trophy className="mx-auto text-yellow-500 w-12 h-12 transition-transform group-hover:scale-110" />
                          <div>
                             <p className="font-black text-xl">Golden Boot</p>
                             <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Inter-City Football 2025</p>
                          </div>
                       </CardContent>
                    </Card>
                  ))}
               </div>
            </section>

            <section className="space-y-8">
               <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><History size={24}/></div>
                  Tournament Timeline
               </h2>
               <Card className="rounded-[2.5rem] shadow-xl border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="pl-8 uppercase font-black text-[10px]">Competition</TableHead>
                        <TableHead className="uppercase font-black text-[10px]">Representative</TableHead>
                        <TableHead className="uppercase font-black text-[10px]">Result</TableHead>
                        <TableHead className="text-right pr-8 uppercase font-black text-[10px]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(h => (
                        <TableRow key={h.id} className="h-16">
                          <TableCell className="pl-8 font-bold">{h.tournament}</TableCell>
                          <TableCell className="font-medium text-muted-foreground">{h.team}</TableCell>
                          <TableCell>
                             <Badge variant={h.result === 'Winner' ? 'default' : 'outline'} className="font-black uppercase text-[9px] tracking-widest">{h.result}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8 text-muted-foreground font-bold text-xs">
                             <div className="flex items-center justify-end gap-2"><Calendar size={12}/> {h.date}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </Card>
            </section>

            <section className="space-y-8">
               <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600"><MessageSquare size={24}/></div>
                  Community Feed
               </h2>
               <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-card/60 rounded-3xl p-8">
                     <p className="font-medium leading-relaxed italic text-gray-700 dark:text-gray-300">
                        "Just signed with The Warriors for the upcoming Summer Cup. Can't wait to hit the pitch and defend our title! See you all there. #SquadGoals #ProLeague"
                     </p>
                     <div className="flex justify-between items-center mt-6">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Posted 4 days ago</span>
                        <div className="flex gap-4">
                           <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary"><Share2 size={14}/> Share</Button>
                        </div>
                     </div>
                  </Card>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
