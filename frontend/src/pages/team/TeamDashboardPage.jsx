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
    <div className="p-24 text-center font-black uppercase tracking-[0.5em] animate-pulse">
      Connecting to Squad Intelligence Hub...
    </div>
  );

  const isOwner = team.owner_id === currentUser?.user_id || currentUser?.is_admin;
  const isMember = team.members?.some(m => m.user_id === currentUser?.user_id);
  const myApp = apps.find(a => a.user_id === currentUser?.user_id && a.status === 'pending');

  if (!isMember && !isOwner) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 space-y-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-l-8 border-foreground pl-12 py-4">
          <div className="space-y-4">
            <Badge variant="outline">Sector: Enlistment Required</Badge>
            <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none">{team.name}</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic">Operational Clearance Necessary</p>
          </div>
        </header>
        
        <div className="border-4 border-foreground p-12 bg-background space-y-12">
          {myApp ? (
            <div className="text-center py-20 space-y-8">
              <ShieldCheck size={80} strokeWidth={1} className="mx-auto" />
              <div className="space-y-2">
                 <h2 className="text-4xl font-black uppercase italic tracking-tighter">Application Logged</h2>
                 <p className="text-sm font-bold uppercase opacity-60">Vetting process in progress. Awaiting command decision.</p>
              </div>
              <Button asChild variant="outline" className="border-2 font-black italic">
                 <Link to="/teams">Return to Registry</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Request Enlistment</h2>
                <p className="text-sm font-bold uppercase opacity-60">Submit operational intent for vetting.</p>
              </div>
              
              <div className="space-y-8">
                <textarea 
                  className="w-full min-h-[200px] p-8 border-2 border-foreground outline-none font-bold uppercase italic tracking-tight"
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
                  className="w-full h-24 text-2xl uppercase italic"
                >
                  Transmit Enlistment File
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '01. Intel', icon: LayoutDashboard },
    { id: 'news', label: '02. Feed', icon: Newspaper },
    { id: 'chat', label: '03. Comms', icon: MessageSquare },
    { id: 'roster', label: '04. Roster', icon: Users },
    { id: 'achievements', label: '05. Awards', icon: Trophy },
  ];

  if (isOwner) {
    tabs.push({ id: 'admin', label: '06. Vetting', icon: UserPlus });
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-l-8 border-foreground pl-12 py-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h1 className="text-6xl font-black tracking-tighter italic uppercase leading-none">{team.name}</h1>
            <Badge variant="outline">{team.sport}</Badge>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-50 italic">
            <span>Invite Code: {team.invite_code}</span>
            <Separator orientation="vertical" className="h-4 w-0.5 bg-foreground" />
            <span>ID: {String(team.id || '').split('-')[0]}</span>
          </div>
        </div>
        <Button asChild variant="outline" className="h-16 px-8 border-2 font-black italic">
          <Link to="/teams">Exit Sector</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 bg-foreground border-2 border-foreground sticky top-0 z-40">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={cn(
              "flex-1 p-6 text-[10px] font-black uppercase tracking-[0.3em] transition-colors",
              activeTab === tab.id ? "bg-background text-foreground" : "bg-foreground text-background hover:bg-muted/10"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-12">
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-foreground border-2 border-foreground">
              <Card className="md:col-span-2 border-none p-12 bg-background rounded-none">
                 <CardHeader className="p-0 mb-8 border-none">
                    <CardTitle>Operational Intel</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <p className="text-xl font-bold uppercase italic leading-tight opacity-70">
                      {team.description || 'No operational brief available for this unit.'}
                    </p>
                 </CardContent>
              </Card>
              <Card className="border-none p-12 bg-background rounded-none">
                 <CardHeader className="p-0 mb-8 border-none">
                    <CardTitle className="text-xl">Command Staff</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0 space-y-1 bg-foreground border-2 border-foreground">
                    {team.members?.filter(m => m.role !== 'member').map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-background p-6">
                         <span className="font-black italic uppercase text-lg">{m.username}</span>
                         <Badge>{m.role}</Badge>
                      </div>
                    ))}
                 </CardContent>
              </Card>
           </div>
        )}

        {activeTab === 'news' && (
           <div className="max-w-3xl mx-auto space-y-24">
              {isOwner && (
                <div className="space-y-8">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">New Broadcast</h2>
                   <textarea 
                    className="w-full min-h-[150px] p-8 border-2 border-foreground font-bold uppercase italic outline-none" 
                    placeholder="Operational Update..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                  />
                  <Button onClick={handleCreatePost} className="w-full h-20 text-xl italic uppercase">Push Transmission</Button>
                </div>
              )}
              
              <div className="space-y-24">
                 {posts.map(post => (
                   <div key={post.id} className="border-l-8 border-foreground pl-12 space-y-4">
                      <p className="text-2xl font-black italic uppercase leading-none">"{post.content}"</p>
                      <div className="flex items-center gap-6 text-[9px] font-black opacity-30 uppercase tracking-[0.3em]">
                         <span><Clock size={12} className="inline mr-2"/> {new Date(post.created_at).toLocaleDateString()}</span>
                         <span>Origin_Verified</span>
                      </div>
                   </div>
                 ))}
                 {posts.length === 0 && (
                    <div className="py-48 text-center opacity-10 font-black text-6xl uppercase italic">Zero Comms</div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'chat' && (
           <Card className="max-w-4xl mx-auto flex flex-col border-4 border-foreground rounded-none shadow-none bg-background">
              <div className="p-8 border-b-4 border-foreground">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Secure Comms</h2>
              </div>
              <div className="h-[500px] overflow-y-auto p-10 space-y-8">
                 {chatMessages.map((msg, i) => {
                   const isMe = msg.user_id === currentUser?.user_id;
                   return (
                     <div key={i} className={cn("flex flex-col gap-2", isMe ? "items-end" : "items-start")}>
                        <div className="flex items-baseline gap-4 opacity-30">
                           {!isMe && <span className="text-[10px] font-black uppercase tracking-widest">{msg.username}</span>}
                           <span className="text-[8px] font-black">{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-6 font-bold uppercase italic text-sm border-2 border-foreground",
                          isMe ? "bg-foreground text-background" : "bg-background"
                        )}>
                          {msg.content}
                        </div>
                     </div>
                   );
                 })}
                 <div ref={chatEndRef} />
              </div>
              <div className="p-8 border-t-4 border-foreground">
                 <form onSubmit={handleSendMessage} className="flex gap-1 bg-foreground border-2 border-foreground">
                    <Input 
                      placeholder="Input Transmission..." 
                      className="flex-1 h-20 border-none text-xl italic font-black uppercase placeholder:opacity-10"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button size="icon" type="submit" className="h-20 w-20 border-l-2 border-foreground"><Send size={24}/></Button>
                 </form>
              </div>
           </Card>
        )}

        {activeTab === 'roster' && (
           <div className="max-w-5xl mx-auto bg-foreground border-2 border-foreground">
              <Table>
                 <TableHeader>
                    <TableRow className="h-16">
                       <TableHead>Combatant</TableHead>
                       <TableHead>Role</TableHead>
                       <TableHead>Enlistment</TableHead>
                       <TableHead className="text-right">Command</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {team.members?.map(m => (
                      <TableRow key={m.id} className="h-24 bg-background border-b-2 border-foreground last:border-b-0">
                         <TableCell>
                            <Link to={`/player/${m.username}`} className="font-black text-2xl italic tracking-tighter uppercase">{m.username}</Link>
                         </TableCell>
                         <TableCell><Badge>{m.role}</Badge></TableCell>
                         <TableCell className="opacity-40 text-[10px] font-black">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                         <TableCell className="text-right">
                            {isOwner && m.user_id !== team.owner_id && (
                              <Button variant="outline" className="h-14 w-14 border-2 text-destructive" onClick={() => handleRemoveMember(m.user_id)}>
                                 <Trash2 size={20}/>
                              </Button>
                            )}
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </div>
        )}

        {activeTab === 'admin' && isOwner && (
           <div className="max-w-3xl mx-auto space-y-16">
              <h2 className="text-5xl font-black uppercase italic tracking-tighter border-b-8 border-foreground pb-4">Vetting Phase</h2>
              <div className="grid grid-cols-1 gap-1 bg-foreground border-2 border-foreground">
                 {apps.map(app => (
                   <div key={app.id} className="bg-background p-12 flex justify-between items-center group">
                      <div className="space-y-4">
                         <p className="font-black text-4xl italic tracking-tighter uppercase leading-none">{app.username}</p>
                         <p className="text-lg font-bold italic uppercase opacity-50 leading-tight">"{app.message}"</p>
                      </div>
                      <div className="flex gap-4">
                         <Button onClick={() => handleApp(app.id, 'approved')} className="h-16 px-10 text-lg italic uppercase">Verify</Button>
                         <Button variant="outline" onClick={() => handleApp(app.id, 'rejected')} className="h-16 px-10 text-lg italic uppercase border-2">Reject</Button>
                      </div>
                   </div>
                 ))}
                 {apps.length === 0 && (
                   <div className="py-48 text-center bg-background">
                      <p className="text-3xl font-black uppercase opacity-10 italic">No Active Vetting Files</p>
                   </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'achievements' && (
           <div className="max-w-6xl mx-auto space-y-16">
              <div className="flex justify-between items-end border-b-8 border-foreground pb-6">
                 <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Squad Trophies</h2>
                 {isOwner && (
                    <Button variant="outline" className="border-2 font-black italic" onClick={() => setAwardModalOpen(true)}>ADD_AWARD</Button>
                 )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 bg-foreground border-2 border-foreground">
                 {team.awards?.map(award => (
                   <Card key={award.id} className="text-center p-12 bg-background border-none rounded-none group relative h-80 flex flex-col items-center justify-center">
                      <Trophy size={60} strokeWidth={1} className="mb-8 opacity-20" />
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{award.title}</h3>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{award.description}</p>
                      {isOwner && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteAward(award.id)}
                            className="absolute top-8 right-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 size={20}/>
                         </Button>
                      )}
                   </Card>
                 ))}
                 {(!team.awards || team.awards.length === 0) && (
                    <div className="col-span-full py-48 text-center bg-background">
                       <p className="text-3xl font-black uppercase opacity-10 italic">Zero Achievements Logged</p>
                    </div>
                 )}
              </div>
              <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Enshrine Achievement</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddAward} className="space-y-8 py-6">
                    <Input placeholder="Trophy Designation" className="h-16 italic font-black uppercase" value={newAward.title} onChange={e => setNewAward({...newAward, title: e.target.value})} required />
                    <Input placeholder="Operational Context" className="h-16 italic font-black uppercase" value={newAward.description} onChange={e => setNewAward({...newAward, description: e.target.value})} required />
                    <Button type="submit" className="w-full h-20 text-xl italic uppercase">Confirm Award</Button>
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
