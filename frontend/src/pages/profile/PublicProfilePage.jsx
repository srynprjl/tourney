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
      <div className="p-12 text-center font-black animate-pulse text-muted-foreground uppercase tracking-widest">
        DECRYPTING PLAYER IDENTITY...
      </div>
    );
  if (!profile)
    return (
      <div className="p-12 text-center font-black text-red-500 uppercase">
        Player Not Found
      </div>
    );

  const isOwnProfile = currentUser?.username === username;

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
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black tracking-tighter dark:text-white uppercase">
                {profile.username}
              </h1>
              {isOwnProfile && (
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-12 h-12 bg-card shadow-lg"
                >
                  {isEditing ? <X size={20} /> : <Edit3 size={20} />}
                </Button>
              )}
            </div>
            <div className="flex gap-4 items-center text-muted-foreground font-bold">
              {isEditing ? (
                <Input
                  value={editData.location}
                  onChange={(e) =>
                    setEditData({ ...editData, location: e.target.value })
                  }
                  placeholder="Location"
                  className="h-8 w-40 rounded-full font-bold"
                />
              ) : (
                <span className="flex items-center gap-1.5">
                  <Globe size={16} /> {profile.location || "Global"}
                </span>
              )}
              <Separator orientation="vertical" className="h-4" />
              <span className="text-primary font-black uppercase text-xs tracking-widest">
                Professional Competitor
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-24">
        {/* Sidebar Stats */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="rounded-[2.5rem] shadow-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tight">
                Biography
              </CardTitle>
              {isEditing && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="rounded-full gap-2"
                >
                  <Save size={14} /> SAVE
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <textarea
                  className="w-full min-h-[150px] p-4 bg-muted/30 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium"
                  value={editData.bio}
                  onChange={(e) =>
                    setEditData({ ...editData, bio: e.target.value })
                  }
                />
              ) : (
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {profile.bio ||
                    "No biography provided. This player prefers to let their results speak for themselves."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8 space-y-12">
          <section className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-600">
                  <Award size={24} />
                </div>
                Career Hall of Fame
              </h2>
              {isOwnProfile && (
                <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-black gap-2"
                    >
                      <Plus size={16} /> ADD AWARD
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="bg-yellow-500 p-10 text-white">
                      <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                        New Achievement
                      </DialogTitle>
                      <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                        Log a new milestone in your career
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAward} className="p-10 space-y-6">
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          Achievement Title
                        </Label>
                        <Input
                          placeholder="E.g. Golden Boot, MVP"
                          className="h-14 rounded-2xl font-black text-lg"
                          value={newAward.title}
                          onChange={(e) =>
                            setNewAward({ ...newAward, title: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          Context / Competition
                        </Label>
                        <Input
                          placeholder="E.g. Pro League 2025"
                          className="h-14 rounded-2xl font-black text-lg"
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
                      <DialogFooter>
                        <Button
                          type="submit"
                          className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-yellow-500/20 mt-4 bg-yellow-500 hover:bg-yellow-600"
                        >
                          COMMIT ACHIEVEMENT
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.awards?.map((award) => (
                <Card
                  key={award.id}
                  className="rounded-3xl border-border/40 hover:border-primary/30 transition-all group overflow-hidden relative"
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <Trophy className="mx-auto text-yellow-500 w-12 h-12 transition-transform group-hover:scale-110" />
                    <div>
                      <p className="font-black text-xl uppercase tracking-tight">
                        {award.title}
                      </p>
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 italic">
                        {award.description}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAward(award.id)}
                        className="absolute top-4 right-4 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!profile.awards || profile.awards.length === 0) && (
                <div className="col-span-full py-20 text-center bg-muted/10 rounded-[2.5rem] border-2 border-dashed">
                  <p className="text-muted-foreground font-black uppercase text-xs tracking-widest italic">
                    No achievements logged yet
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <History size={24} />
              </div>
              Tournament Timeline
            </h2>
            <Card className="rounded-[2.5rem] shadow-xl border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="pl-8 uppercase font-black text-[10px]">
                      Competition
                    </TableHead>
                    <TableHead className="uppercase font-black text-[10px]">
                      Type
                    </TableHead>
                    <TableHead className="uppercase font-black text-[10px]">
                      Sport
                    </TableHead>
                    <TableHead className="text-right pr-8 uppercase font-black text-[10px]">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow
                      key={h.id}
                      className="h-16 group cursor-pointer hover:bg-muted/20"
                      onClick={() =>
                        (window.location.href = `/tournament/${h.id}`)
                      }
                    >
                      <TableCell className="pl-8 font-black uppercase tracking-tight italic text-lg">
                        {h.name}
                      </TableCell>
                      <TableCell className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest">
                        {h.type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-black uppercase text-[9px] tracking-widest border-primary/20 text-primary"
                        >
                          {h.sport}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2 font-black text-[10px] uppercase text-muted-foreground">
                          <Activity
                            size={12}
                            className="text-green-500 animate-pulse"
                          />{" "}
                          ACTIVE
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-32 text-center text-muted-foreground font-black uppercase text-xs tracking-widest italic"
                      >
                        No active arena deployments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>

          <section className="space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                <MessageSquare size={24} />
              </div>
              Community Feed
            </h2>
            <div className="space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-card p-8">
                <form onSubmit={handlePostComment} className="space-y-4">
                  <textarea
                    className="w-full min-h-[100px] p-6 bg-muted/30 rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-primary font-medium text-base italic"
                    placeholder="Leave a message on this player's wall..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="rounded-2xl font-black px-8 gap-2 shadow-lg shadow-primary/20"
                    >
                      <Send size={16} /> BROADCAST
                    </Button>
                  </div>
                </form>
              </Card>

              <div className="space-y-6">
                {comments.map((comment) => (
                  <Card
                    key={comment.id}
                    className="border-none shadow-sm bg-card/60 rounded-[2.5rem] p-8 group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {comment.author[0].toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/player/${comment.author}`}
                            className="font-black uppercase text-sm hover:text-primary transition-colors"
                          >
                            {comment.author}
                          </Link>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
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
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                    <p className="font-medium leading-relaxed italic text-gray-700 dark:text-gray-300 pl-2">
                      "{comment.content}"
                    </p>
                  </Card>
                ))}
                {comments.length === 0 && (
                  <div className="py-20 text-center bg-muted/10 rounded-[2.5rem] border-2 border-dashed">
                    <p className="text-muted-foreground font-black uppercase text-xs tracking-widest italic">
                      No broadcasts on this wall yet
                    </p>
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
