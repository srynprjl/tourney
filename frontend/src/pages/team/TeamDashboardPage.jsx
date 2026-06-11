import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { teamService } from '@/services/teamService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Users, Newspaper, MessageSquare, Shield, 
  UserPlus, Send, Clock, Trash2, 
  ChevronRight, Trophy, Briefcase, LayoutDashboard
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
import { Plus, ShieldCheck } from "lucide-react";

const TeamDashboardPage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [apps, setApps] = useState([]);
  
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [newAward, setNewAward] = useState({ title: '', description: '' });

  const [chatMessages, setChatHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  const wsMessage = useWebSocket(id);

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
    if (!window.confirm('Remove this member?')) return;
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
    if (!window.confirm('Delete award?')) return;
    try {
      await teamService.deleteAward(id, awardId);
      fetchTeam();
    } catch (err) {
      alert('Deletion failed');
    }
  };

  if (!team) return (
    <div className="min-h-[400px] flex items-center justify-center font-medium text-muted-foreground animate-pulse">
      Connecting to Squad HUD...
    </div>
  );

  const isOwner = team.owner_id === currentUser?.user_id || currentUser?.is_admin;
  const isMember = team.members?.some(m => m.user_id === currentUser?.user_id);
  const myApp = apps.find(a => a.user_id === currentUser?.user_id && a.status === 'pending');

  if (!isMember && !isOwner) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-10">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{team.name}</h1>
            <Badge variant="secondary" className="capitalize">{team.sport}</Badge>
          </div>
          <p className="text-muted-foreground font-medium">Restricted access. Enlistment required to view operational data.</p>
        </header>
        
        <Card className="p-8 border-none shadow-xl bg-card">
          {myApp ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                 <h2 className="text-2xl font-bold tracking-tight">Application Transmitted</h2>
                 <p className="text-sm text-muted-foreground">Vetting process in progress. Awaiting command decision.</p>
              </div>
              <Button asChild variant="outline">
                 <Link to="/teams">Return to Registry</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Request Enlistment</h2>
                <p className="text-sm text-muted-foreground">Submit your operational intent for command vetting.</p>
              </div>
              
              <div className="space-y-6">
                <textarea 
                  className="w-full min-h-[150px] p-4 rounded-xl border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Operational Motivation..."
                  id="appMessage"
                />
                <Button 
                  onClick={async () => {
                    const msg = document.getElementById('appMessage').value;
                    try {
                      await teamService.apply(id, msg);
                      alert('Application Transmitted');
                      fetchApplications();
                    } catch (err) {
                      alert('Transmission Failed');
                    }
                  }}
                  className="w-full h-12 font-semibold"
                >
                  Transmit Enlistment File
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Intel', icon: LayoutDashboard },
    { id: 'news', label: 'Feed', icon: Newspaper },
    { id: 'chat', label: 'Comms', icon: MessageSquare },
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'achievements', label: 'Awards', icon: Trophy },
  ];

  if (isOwner) {
    tabs.push({ id: 'admin', label: 'Vetting', icon: UserPlus });
  }

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{team.name}</h1>
            <Badge variant="secondary" className="capitalize">{team.sport}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
            <span>Invite Code: <span className="font-mono text-primary">{team.invite_code}</span></span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="font-mono text-xs opacity-70">ID: {String(team.id || '').split('-')[0]}</span>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/teams">Exit Sector</Link>
        </Button>
      </header>

      <div className="flex p-1 bg-muted rounded-xl w-fit overflow-x-auto max-w-full no-scrollbar sticky top-0 z-40 shadow-sm border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                       <Briefcase size={20} className="text-primary" /> Operational Intel
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {team.description || 'No operational brief available for this unit.'}
                    </p>
                 </CardContent>
              </Card>
              <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Command Staff</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3">
                    {team.members?.filter(m => m.role !== 'member').map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border">
                         <span className="font-semibold text-sm">{m.username}</span>
                         <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                      </div>
                    ))}
                 </CardContent>
              </Card>
           </div>
        )}

        {activeTab === 'news' && (
           <div className="max-w-3xl mx-auto space-y-12">
              {isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Push Broadcast</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <textarea 
                      className="w-full min-h-[120px] p-4 rounded-xl border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20" 
                      placeholder="Operational Update..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                    />
                    <Button onClick={handleCreatePost} className="w-full font-semibold">Post Transmission</Button>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-10">
                 {posts.map(post => (
                   <div key={post.id} className="relative pl-8 border-l-2 border-primary/20 space-y-2">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary border-4 border-background" />
                      <p className="text-base font-medium leading-relaxed">"{post.content}"</p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                         <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(post.created_at).toLocaleDateString()}</span>
                         <span>Origin Verified</span>
                      </div>
                   </div>
                 ))}
                 {posts.length === 0 && (
                    <div className="py-24 text-center opacity-30 italic text-sm">No transmissions detected.</div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'chat' && (
           <Card className="max-w-4xl mx-auto flex flex-col overflow-hidden h-[600px]">
              <CardHeader className="bg-muted/50 border-b pb-4">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare size={18} className="text-primary" /> Secure Channel
                 </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {chatMessages.map((msg, i) => {
                   const isMe = msg.user_id === currentUser?.user_id;
                   return (
                     <div key={i} className={cn("flex flex-col gap-1.5", isMe ? "items-end" : "items-start")}>
                        <div className="flex items-center gap-2 px-1">
                           {!isMe && <span className="text-[10px] font-bold text-muted-foreground uppercase">{msg.username}</span>}
                           <span className="text-[8px] font-medium text-muted-foreground/40">{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-3 text-sm font-medium rounded-2xl shadow-sm",
                          isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                     </div>
                   );
                 })}
                 <div ref={chatEndRef} />
              </div>
              <CardFooter className="p-4 border-t bg-muted/20">
                 <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
                    <Input 
                      placeholder="Input Transmission..." 
                      className="flex-1 h-11 shadow-none border-muted"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button size="icon" type="submit" className="h-11 w-11 shrink-0"><Send size={18}/></Button>
                 </form>
              </CardFooter>
           </Card>
        )}

        {activeTab === 'roster' && (
           <Card className="max-w-4xl mx-auto overflow-hidden">
              <Table>
                 <TableHeader>
                    <TableRow>
                       <TableHead>Combatant</TableHead>
                       <TableHead>Role</TableHead>
                       <TableHead>Enlistment</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {team.members?.map(m => (
                      <TableRow key={m.id}>
                         <TableCell>
                            <Link to={`/player/${m.username}`} className="font-semibold text-primary hover:underline">{m.username}</Link>
                         </TableCell>
                         <TableCell><Badge variant="outline" className="capitalize text-[10px]">{m.role}</Badge></TableCell>
                         <TableCell className="text-xs text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                         <TableCell className="text-right">
                            {isOwner && m.user_id !== team.owner_id && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(m.user_id)}>
                                 <Trash2 size={16}/>
                              </Button>
                            )}
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </Card>
        )}

        {activeTab === 'admin' && isOwner && (
           <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-2xl font-bold tracking-tight border-b pb-4">Vetting Phase</h2>
              <div className="grid grid-cols-1 gap-4">
                 {apps.map(app => (
                   <Card key={app.id} className="p-6 group flex justify-between items-center">
                      <div className="space-y-2">
                         <p className="font-bold text-xl">{app.username}</p>
                         <p className="text-sm text-muted-foreground italic leading-relaxed">"{app.message}"</p>
                      </div>
                      <div className="flex gap-2">
                         <Button onClick={() => handleApp(app.id, 'approved')} size="sm">Verify</Button>
                         <Button variant="outline" onClick={() => handleApp(app.id, 'rejected')} size="sm">Reject</Button>
                      </div>
                   </Card>
                 ))}
                 {apps.length === 0 && (
                   <div className="py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                      <p className="text-sm text-muted-foreground italic">No active vetting files.</p>
                   </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'achievements' && (
           <div className="space-y-8">
              <div className="flex items-center justify-between border-b pb-4">
                 <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Trophy size={22} className="text-primary" /> Squad Trophies
                 </h2>
                 {isOwner && (
                    <Button variant="outline" size="sm" onClick={() => setAwardModalOpen(true)}>Add Award</Button>
                 )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {team.awards?.map(award => (
                   <Card key={award.id} className="p-8 group relative flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/40 mb-6 group-hover:scale-110 transition-transform">
                        <Trophy size={32} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-bold tracking-tight mb-2">{award.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">{award.description}</p>
                      {isOwner && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteAward(award.id)}
                            className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 size={16}/>
                         </Button>
                      )}
                   </Card>
                 ))}
                 {(!team.awards || team.awards.length === 0) && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                       <p className="text-sm text-muted-foreground italic">Zero achievements logged.</p>
                    </div>
                 )}
              </div>
              <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Enshrine Achievement</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddAward} className="space-y-6 pt-4">
                    <div className="space-y-2">
                       <Label>Trophy Name</Label>
                       <Input placeholder="e.g. Major Championship Winner" value={newAward.title} onChange={e => setNewAward({...newAward, title: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                       <Label>Context</Label>
                       <Input placeholder="e.g. Won the Summer 2026 Finals" value={newAward.description} onChange={e => setNewAward({...newAward, description: e.target.value})} required />
                    </div>
                    <DialogFooter>
                       <Button type="submit" className="w-full">Confirm Award</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
           </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboardPage;
