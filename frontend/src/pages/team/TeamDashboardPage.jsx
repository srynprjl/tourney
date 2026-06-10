import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Users, Newspaper, MessageSquare, Shield, 
  Settings, UserPlus, Send, Clock, Trash2, 
  ChevronRight, Award, Trophy, Briefcase, LayoutDashboard
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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
import { Plus } from "lucide-react";

const TeamDashboardPage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [apps, setApps] = useState([]);
  
  // Award states
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [newAward, setNewAward] = useState({ title: '', description: '' });

  const [chatMessages, setChatHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  const wsMessage = useWebSocket(id);

  useEffect(() => {
    fetchTeam();
    fetchPosts();
    fetchChatHistory();
  }, [id]);

  useEffect(() => {
    if (wsMessage && wsMessage.type === 'chat_message') {
      setChatHistory(prev => [...prev, wsMessage.data]);
    }
  }, [wsMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  const fetchTeam = async () => {
    try {
      const res = await teamService.get(id);
      setTeam(res.data);
      if (res.data.owner_id === currentUser?.user_id) {
         fetchApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await teamService.getPosts(id);
      setPosts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await teamService.getChatHistory(id);
      setChatHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await teamService.getApplications(id);
      setApps(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await teamService.createPost(id, newPost);
      setNewPost('');
      fetchPosts();
    } catch (err) {
      alert('Failed to post');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await teamService.sendChatMessage(id, newMessage);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleApp = async (appId, status) => {
    try {
      await teamService.handleApplication(id, appId, status);
      fetchApplications();
      fetchTeam();
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the squad?')) return;
    try {
      await teamService.removeMember(id, userId);
      fetchTeam();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleAddAward = async (e) => {
    e.preventDefault();
    try {
      await teamService.addAward(id, newAward);
      setNewAward({ title: '', description: '' });
      setAwardModalOpen(false);
      fetchTeam();
    } catch (err) {
      alert('Failed to add award');
    }
  };

  const handleDeleteAward = async (awardId) => {
    if (!window.confirm('Delete this achievement?')) return;
    try {
      await teamService.deleteAward(id, awardId);
      fetchTeam();
    } catch (err) {
      alert('Deletion failed');
    }
  };

  if (!team) return <div className="p-12 text-center font-black animate-pulse text-muted-foreground uppercase tracking-widest">CONNECTING TO SQUAD HUD...</div>;

  const isOwner = team.owner_id === currentUser?.user_id || currentUser?.is_admin;
  const isMember = team.members?.some(m => m.user_id === currentUser?.user_id);
  const myApp = apps.find(a => a.user_id === currentUser?.user_id && a.status === 'pending');

  if (!isMember && !isOwner) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 py-20">
        <div className="text-center space-y-6">
          <Shield size={80} className="mx-auto text-primary/20" />
          <h1 className="text-6xl font-black tracking-tighter uppercase italic">{team.name}</h1>
          <p className="text-muted-foreground font-bold text-xl">Operational clearance required to access this squad HUD.</p>
        </div>
        
        <Card className="rounded-[3rem] border-none shadow-2xl p-12 bg-card space-y-8">
          {myApp ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto shadow-xl">
                 <ShieldCheck size={40} className="text-green-500" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-3xl font-black uppercase tracking-tight italic">Application Transmitted</h2>
                 <p className="text-muted-foreground font-medium">Your credentials have been successfully uploaded to the squad registry. Awaiting commander vetting.</p>
              </div>
              <Button asChild variant="outline" className="rounded-2xl font-black px-10 h-14 border-primary/20 text-primary">
                 <Link to="/teams">RETURN TO SQUAD LIST</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase tracking-tight italic">Enlistment Request</h2>
                <p className="text-muted-foreground font-medium">Transmit your credentials and a brief operational message to the squad commander for vetting.</p>
              </div>
              
              <div className="space-y-4">
                <textarea 
                  className="w-full min-h-[150px] p-8 bg-muted/30 rounded-[2rem] outline-none focus:ring-2 focus:ring-primary font-medium italic"
                  placeholder="Why should you be part of this squad?"
                  id="appMessage"
                />
                <Button 
                  onClick={async () => {
                    const msg = document.getElementById('appMessage').value;
                    try {
                      await teamService.apply(id, msg);
                      alert('Application transmitted successfully');
                      fetchApplications();
                    } catch (err) {
                      alert(err.response?.data?.error || 'Transmission failed');
                    }
                  }}
                  className="w-full h-16 rounded-[1.5rem] font-black text-xl shadow-xl shadow-primary/20"
                >
                  TRANSMIT APPLICATION
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'news', label: 'Team Feed', icon: Newspaper },
    { id: 'chat', label: 'Squad Chat', icon: MessageSquare },
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'achievements', label: 'Awards', icon: Trophy },
  ];

  if (isOwner) {
    tabs.push({ id: 'admin', label: 'Applications', icon: UserPlus });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/teams"><ChevronRight className="rotate-180" size={18}/></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase italic">{team.name}</h1>
            <div className="flex gap-2 mt-1">
               <Badge className="bg-primary/20 text-primary border-none uppercase text-[10px] font-black">{team.sport}</Badge>
               <Badge variant="outline" className="text-[10px] font-bold border-border/50">INVITE CODE: {team.invite_code}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 bg-muted/40 p-2 rounded-[2rem] w-fit border border-border/50">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={cn(
              "rounded-[1.5rem] gap-3 px-8 font-black text-xs uppercase tracking-widest transition-all h-12",
              activeTab === tab.id ? "shadow-xl shadow-primary/20 bg-card text-primary" : "text-muted-foreground"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="md:col-span-2 rounded-[3rem] border-none shadow-xl bg-card/60 backdrop-blur-sm">
                 <CardHeader className="p-10 pb-0">
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">About Squad</CardTitle>
                 </CardHeader>
                 <CardContent className="p-10 pt-6">
                    <p className="text-muted-foreground font-bold text-lg leading-relaxed">{team.description || 'No description provided. This squad focuses on performance over paperwork.'}</p>
                 </CardContent>
              </Card>
              <Card className="rounded-[3rem] border-none shadow-xl bg-card">
                 <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-3"><Briefcase size={18} className="text-primary"/> Staff Unit</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-4">
                    {team.members?.filter(m => m.role !== 'member').map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-muted/20 p-5 rounded-[1.5rem] border border-border/40">
                         <span className="font-black text-sm uppercase">{m.username}</span>
                         <Badge variant="secondary" className="uppercase text-[9px] font-black bg-primary/10 text-primary">{m.role}</Badge>
                      </div>
                    ))}
                 </CardContent>
              </Card>
           </div>
        )}

        {activeTab === 'news' && (
           <div className="max-w-3xl mx-auto space-y-12">
              {isOwner && (
                <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] shadow-2xl">
                   <CardHeader className="p-8 pb-0">
                      <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-primary">Global Squad Broadcast</CardTitle>
                   </CardHeader>
                   <CardContent className="p-8 space-y-6">
                      <textarea 
                        className="w-full min-h-[120px] p-8 bg-background border-none rounded-[2rem] outline-none focus:ring-2 focus:ring-primary shadow-inner font-medium text-base italic" 
                        placeholder="What's the plan, Captain?"
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                      />
                      <div className="flex justify-end">
                         <Button onClick={handleCreatePost} className="font-black rounded-[1.5rem] px-12 h-14 text-lg shadow-xl shadow-primary/30 transform hover:-translate-y-1 transition-all">Broadcast</Button>
                      </div>
                   </CardContent>
                </Card>
              )}
              
              <div className="space-y-8">
                 {posts.map(post => (
                   <div key={post.id} className="relative group pl-8">
                      <div className="absolute left-0 top-0 w-1 h-full bg-primary/10 rounded-full group-hover:bg-primary transition-colors" />
                      <div className="space-y-4">
                        <p className="font-bold text-xl leading-relaxed italic text-foreground">"{post.content}"</p>
                        <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                           <div className="flex items-center gap-1.5"><Clock size={12}/> {new Date(post.created_at).toLocaleDateString()}</div>
                           <Separator orientation="vertical" className="h-3" />
                           <div className="text-primary opacity-60">Verified Origin</div>
                        </div>
                      </div>
                   </div>
                 ))}
                 {posts.length === 0 && (
                    <div className="py-40 text-center opacity-20 font-black text-4xl uppercase tracking-tighter italic">No Broadcasts</div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'chat' && (
           <Card className="max-w-4xl mx-auto h-[700px] flex flex-col rounded-[3.5rem] border-none shadow-2xl overflow-hidden bg-card/40 backdrop-blur-md">
              <CardHeader className="p-10 border-b bg-card">
                 <CardTitle className="flex items-center gap-4 text-2xl font-black italic uppercase tracking-tighter">
                   <div className="w-2 h-8 bg-primary rounded-full shadow-lg shadow-primary/20" />
                   Secure Squad Channel
                 </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-10 space-y-8 bg-muted/5">
                 {chatMessages.map((msg, i) => {
                   const isMe = msg.user_id === currentUser?.user_id;
                   return (
                     <div key={i} className={cn("flex flex-col gap-2", isMe ? "items-end" : "items-start")}>
                        <div className="flex items-baseline gap-3">
                           {!isMe && <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">{msg.username}</span>}
                           <span className="text-[9px] text-muted-foreground font-black uppercase">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className={cn(
                          "max-w-[85%] p-5 rounded-[2rem] font-bold text-sm shadow-sm transition-all",
                          isMe ? "bg-primary text-primary-foreground rounded-tr-none shadow-xl shadow-primary/10" : "bg-card text-foreground rounded-tl-none border border-border/50"
                        )}>
                          {msg.content}
                        </div>
                     </div>
                   );
                 })}
                 <div ref={chatEndRef} />
              </CardContent>
              <CardFooter className="p-8 border-t bg-card">
                 <form onSubmit={handleSendMessage} className="flex gap-4 w-full">
                    <Input 
                      placeholder="Enter transmission data..." 
                      className="rounded-[1.5rem] h-16 bg-muted/40 border-none font-black px-8 text-lg"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button size="icon" type="submit" className="h-16 w-16 rounded-[1.5rem] shadow-2xl shadow-primary/30 transform active:scale-95 transition-all"><Send size={24}/></Button>
                 </form>
              </CardFooter>
           </Card>
        )}

        {activeTab === 'roster' && (
           <div className="max-w-5xl mx-auto">
              <Card className="rounded-[3rem] overflow-hidden border-none shadow-2xl bg-card">
                 <Table>
                    <TableHeader>
                       <TableRow className="bg-muted/40 border-none">
                          <TableHead className="pl-12 h-20 uppercase font-black text-[11px] tracking-[0.2em]">Combatant Profile</TableHead>
                          <TableHead className="h-20 uppercase font-black text-[11px] tracking-[0.2em]">Squad Role</TableHead>
                          <TableHead className="h-20 uppercase font-black text-[11px] tracking-[0.2em]">Enlisted</TableHead>
                          <TableHead className="text-right pr-12 h-20 uppercase font-black text-[11px] tracking-[0.2em]">Actions</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {team.members?.map(m => (
                         <TableRow key={m.id} className="h-24 border-border/20 hover:bg-muted/10 transition-colors">
                            <TableCell className="pl-12">
                               <Link to={`/player/${m.username}`} className="font-black text-xl hover:text-primary transition-all tracking-tighter uppercase">{m.username}</Link>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="font-black text-[10px] uppercase tracking-widest bg-muted/50 px-3">{m.role}</Badge></TableCell>
                            <TableCell className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right pr-12">
                               {isOwner && m.user_id !== team.owner_id && (
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={() => handleRemoveMember(m.user_id)}
                                   className="w-12 h-12 text-destructive hover:bg-destructive/10 rounded-2xl"
                                  >
                                    <Trash2 size={20}/>
                                  </Button>
                               )}
                            </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </Card>
           </div>
        )}

        {activeTab === 'admin' && isOwner && (
           <div className="max-w-2xl mx-auto space-y-12">
              <header className="text-center">
                 <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-3">Recruitment Center</h2>
                 <p className="text-muted-foreground font-bold text-sm tracking-widest uppercase">Personnel Vetting & Approval</p>
              </header>
              <div className="space-y-6">
                 {apps.map(app => (
                   <Card key={app.id} className="rounded-[2.5rem] border-none shadow-xl bg-card group">
                      <CardContent className="p-8 flex justify-between items-center">
                         <div className="space-y-2">
                            <p className="font-black text-2xl tracking-tighter uppercase">{app.username}</p>
                            <p className="text-sm text-muted-foreground italic font-bold">"{app.message}"</p>
                         </div>
                         <div className="flex gap-3">
                            <Button size="lg" onClick={() => handleApp(app.id, 'approved')} className="bg-green-600 hover:bg-green-700 font-black rounded-2xl px-8 h-14 shadow-lg shadow-green-600/20">ACCEPT</Button>
                            <Button size="lg" variant="ghost" onClick={() => handleApp(app.id, 'rejected')} className="text-red-500 hover:bg-red-50 font-black rounded-2xl px-8 h-14">REJECT</Button>
                         </div>
                      </CardContent>
                   </Card>
                 ))}
                 {apps.length === 0 && (
                   <div className="py-32 text-center space-y-6 bg-muted/10 rounded-[4rem] border-2 border-dashed border-border/50">
                      <Users size={48} className="mx-auto text-muted-foreground/10" />
                      <p className="text-muted-foreground font-black uppercase text-xs tracking-[0.4em]">No active enlistment files</p>
                   </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'achievements' && (
           <div className="max-w-5xl mx-auto py-10 space-y-10">
              <div className="flex justify-between items-center px-4">
                 <h2 className="text-3xl font-black uppercase tracking-tighter italic">Squad Achievements</h2>
                 {isOwner && (
                    <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
                       <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-xl font-black gap-2">
                             <Plus size={16}/> ADD AWARD
                          </Button>
                       </DialogTrigger>
                       <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                          <DialogHeader className="bg-yellow-500 p-10 text-white">
                             <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">New Trophy</DialogTitle>
                             <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-2">Log a new squad milestone</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddAward} className="p-10 space-y-6">
                             <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Trophy Title</Label>
                                <Input 
                                   placeholder="E.g. Regional Champion, League Winner" 
                                   className="h-14 rounded-2xl font-black text-lg" 
                                   value={newAward.title}
                                   onChange={e => setNewAward({...newAward, title: e.target.value})}
                                   required 
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Context / Competition</Label>
                                <Input 
                                   placeholder="E.g. Pro Cup 2026" 
                                   className="h-14 rounded-2xl font-black text-lg" 
                                   value={newAward.description}
                                   onChange={e => setNewAward({...newAward, description: e.target.value})}
                                   required 
                                />
                             </div>
                             <DialogFooter>
                                <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-yellow-500/20 mt-4 bg-yellow-500 hover:bg-yellow-600">ENSHRINE TROPHY</Button>
                             </DialogFooter>
                          </form>
                       </DialogContent>
                    </Dialog>
                 )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {team.awards?.map(award => (
                   <Card key={award.id} className="text-center py-16 relative overflow-hidden group rounded-[3rem] border-none shadow-2xl bg-card">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-all duration-700" />
                      <div className="w-20 h-20 bg-yellow-500/10 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner transition-transform group-hover:scale-110">
                         <Trophy size={40} />
                      </div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">{award.title}</CardTitle>
                      <CardDescription className="mt-3 font-black text-primary text-sm tracking-[0.2em] uppercase">{award.description}</CardDescription>
                      {isOwner && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteAward(award.id)}
                            className="absolute top-6 right-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 size={16}/>
                         </Button>
                      )}
                   </Card>
                 ))}
                 {(!team.awards || team.awards.length === 0) && (
                    <div className="col-span-full py-40 text-center bg-muted/10 rounded-[4rem] border-2 border-dashed">
                       <p className="text-muted-foreground font-black uppercase text-xs tracking-widest italic">No squad achievements recorded</p>
                    </div>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboardPage;
