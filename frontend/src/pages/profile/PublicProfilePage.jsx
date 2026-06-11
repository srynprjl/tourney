import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import {
  User,
  Award,
  History,
  Globe,
  MapPin,
  Trophy,
  MessageSquare,
  Shield,
  Share2,
  ExternalLink,
  Calendar,
  Edit3,
  Save,
  X,
  Plus,
  Activity,
  Trash2,
  Send,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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

const PublicProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ bio: "", location: "" });

  // Award states
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [newAward, setNewAward] = useState({ title: "", description: "" });

  // Comment state
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchHistory();
    fetchComments();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/profile/profiles/${username}`);
      setProfile(res.data);
      setEditData({
        bio: res.data.bio || "",
        location: res.data.location || "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/tournaments/participating");
      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/profile/profiles/${username}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/profile/profiles/${username}/comments`, {
        content: newComment,
      });
      setNewComment("");
      fetchComments();
    } catch (err) {
      alert("Failed to post comment");
    }
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await api.delete(`/profile/comments/${id}`);
      fetchComments();
    } catch (err) {
      alert("Failed to delete comment");
    }
  };

  const handleToggleLike = async (commentId) => {
    try {
      await api.post(`/profile/comments/${commentId}/like`);
      fetchComments();
    } catch (err) {
      alert("Failed to toggle like");
    }
  };

  const handleSave = async () => {
    try {
      await api.put("/profile/profiles/me", editData);
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      alert("Failed to update profile");
    }
  };

  const handleAddAward = async (e) => {
    e.preventDefault();
    try {
      await api.post("/profile/profiles/me/awards", newAward);
      setNewAward({ title: "", description: "" });
      setAwardModalOpen(false);
      fetchProfile();
    } catch (err) {
      alert("Failed to add award");
    }
  };

  const handleDeleteAward = async (id) => {
    if (!window.confirm("Delete this achievement?")) return;
    try {
      await api.delete(`/profile/profiles/me/awards/${id}`);
      fetchProfile();
    } catch (err) {
      alert("Deletion failed");
    }
  };

  if (loading)
    return (
      <div className="min-h-[400px] flex items-center justify-center font-bold tracking-tighter text-2xl animate-pulse uppercase">
        Loading Profile...
      </div>
    );
  if (!profile)
    return (
      <div className="p-12 text-center font-black text-red-600 uppercase tracking-widest">
        Profile Not Found
      </div>
    );

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="space-y-12 pb-20">
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b">
        <div className="flex items-start gap-8">
          <div className="w-32 h-32 border-2 border-primary flex items-center justify-center shrink-0">
             <User size={48} strokeWidth={2.5} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">User Profile</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">
                {profile.username}
              </h1>
              {isOwnProfile && (
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant="outline"
                  size="sm"
                  className="w-10 h-10 p-0 border rounded-none"
                >
                  {isEditing ? <X size={14} /> : <Edit3 size={14} />}
                </Button>
              )}
            </div>
            <div className="flex gap-6 items-center text-[10px] font-bold uppercase tracking-[0.2em]">
              {isEditing ? (
                <Input
                  value={editData.location}
                  onChange={(e) =>
                    setEditData({ ...editData, location: e.target.value })
                  }
                  placeholder="LOCATION"
                  className="h-8 w-40 rounded-none border-x-0 border-t-0 border-b px-0 focus-visible:ring-0 uppercase font-bold"
                />
              ) : (
                <span className="opacity-60">{profile.location || "GLOBAL"}</span>
              )}
              <span className="opacity-20">//</span>
              <span className="text-primary opacity-100">COMPETITOR</span>
            </div>
          </div>
        </div>
        {isEditing && (
          <Button
            size="lg"
            onClick={handleSave}
            className="px-10 font-black uppercase tracking-widest text-[10px] h-12"
          >
            Save Profile
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Sidebar Stats */}
        <div className="lg:col-span-4 space-y-12">
          <section className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 border-b pb-4">About</h2>
            <div className="p-0">
              {isEditing ? (
                <textarea
                  className="w-full min-h-[200px] p-6 bg-accent/30 border-none outline-none focus:ring-0 font-bold text-xs uppercase tracking-widest leading-relaxed"
                  value={editData.bio}
                  onChange={(e) =>
                    setEditData({ ...editData, bio: e.target.value })
                  }
                />
              ) : (
                <p className="text-[10px] font-bold uppercase tracking-widest leading-loose opacity-60">
                  {profile.bio ||
                    "No biography provided."}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8 space-y-20">
          <section className="space-y-12">
            <div className="flex justify-between items-end border-b pb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Achievements</h2>
              {isOwnProfile && (
                <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-6 font-black uppercase tracking-widest text-[10px] h-10"
                    >
                      Add Award
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-0 rounded-none p-10">
                    <DialogHeader className="space-y-6">
                      <DialogTitle className="text-3xl font-bold uppercase tracking-tighter">New Award</DialogTitle>
                      <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        Record a new achievement.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAward} className="space-y-8 pt-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Award Title</Label>
                        <Input
                          placeholder="E.G. MVP"
                          className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                          value={newAward.title}
                          onChange={(e) =>
                            setNewAward({ ...newAward, title: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Context</Label>
                        <Input
                          placeholder="E.G. PRO LEAGUE"
                          className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                          value={newAward.description}
                          onChange={(e) =>
                            setNewAward({
                              ...newAward,
                              description: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full font-black uppercase tracking-widest text-[10px] h-14">Commit Award</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l">
              {profile.awards?.map((award, i) => (
                <div
                  key={award.id}
                  className="p-10 border-r border-b hover:bg-accent/30 transition-colors group relative"
                >
                  <div className="flex flex-col space-y-8">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Award {String(i + 1).padStart(2, '0')}</span>
                       <Trophy className="opacity-20 group-hover:opacity-100 transition-opacity" size={16} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold uppercase tracking-tighter leading-none">{award.title}</h3>
                       <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{award.description}</p>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAward(award.id)}
                      className="absolute top-4 right-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {(!profile.awards || profile.awards.length === 0) && (
                <div className="col-span-full py-20 text-center border-b border-r">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">No recorded awards</h3>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-12">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 border-b pb-6">History</h2>
            <div className="border-t border-l">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background border-none h-16">
                    <TableHead className="pl-8 uppercase font-black text-[10px] tracking-widest border-r border-b">Competition</TableHead>
                    <TableHead className="uppercase font-black text-[10px] tracking-widest border-r border-b">Type</TableHead>
                    <TableHead className="text-right pr-8 uppercase font-black text-[10px] tracking-widest border-r border-b">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow
                      key={h.id}
                      className="h-20 border-none hover:bg-accent/30 transition-colors group cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/tournament/${h.id}`)
                      }
                    >
                      <TableCell className="pl-8 border-r border-b">
                         <div className="space-y-1">
                            <span className="font-bold text-lg tracking-tighter uppercase leading-none">{h.name}</span>
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{h.sport}</p>
                         </div>
                      </TableCell>
                      <TableCell className="border-r border-b">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                          {h.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-8 border-r border-b">
                        <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 border border-primary bg-primary text-primary-foreground">
                          ACTIVE
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-16 text-center border-r border-b"
                      >
                         <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">No active arenas</h3>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-12">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 border-b pb-6">Feed</h2>
            <div className="space-y-16">
              <div className="space-y-6">
                <textarea
                  className="w-full min-h-[120px] p-8 bg-accent/30 border-none outline-none focus:ring-0 font-bold text-[10px] uppercase tracking-widest leading-relaxed"
                  placeholder="LEAVE A MESSAGE..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handlePostComment}
                    className="px-12 font-black uppercase tracking-widest text-[10px] h-12"
                  >
                    Post Message
                  </Button>
                </div>
              </div>

              <div className="space-y-0 border-t border-l">
                {comments.map((comment, i) => (
                  <div
                    key={comment.id}
                    className="p-10 border-r border-b hover:bg-accent/30 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <Link
                            to={`/player/${comment.author}`}
                            className="text-[10px] font-black uppercase tracking-widest hover:opacity-50 transition-opacity"
                          >
                            {comment.author}
                          </Link>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {(currentUser?.username === comment.author ||
                        isOwnProfile ||
                        currentUser?.is_admin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-loose pl-8 border-l-2 mb-8">
                      {comment.content}
                    </p>
                    <div className="flex justify-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-auto p-0 font-black text-[8px] tracking-[0.3em] uppercase hover:bg-transparent",
                          comment.is_liked ? "text-primary" : "text-muted-foreground opacity-40 hover:opacity-100"
                        )}
                        onClick={() => handleToggleLike(comment.id)}
                      >
                        <Heart size={10} className={cn("mr-2", comment.is_liked ? "fill-current" : "")} />
                        {comment.likes_count || 0} APPRECIATION
                      </Button>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="py-20 text-center border-r border-b">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">No messages</h3>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
