import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Trophy,
  Users,
  Play,
  Plus,
  Edit3,
  Trash2,
  Save,
  ChevronRight,
  ArrowRightCircle,
  Info,
  Calendar,
  ScrollText,
  Newspaper,
  MessageSquare,
  Megaphone,
  Clock,
  Tv,
  Gavel,
  ExternalLink,
  Lock,
  Globe,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Activity,
  Award,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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

const TournamentDetailsPage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [activeTab, setActiveTab] = useState("matches");

  // Modal states
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [ruleContent, setRuleContent] = useState("");
  const [prizeRank, setPrizeRank] = useState("");
  const [prizeValue, setPrizeValue] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [hasPaid, setHasPaid] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [streamUrl, setStreamUrl] = useState("");

  const [editingMatch, setEditingMatch] = useState(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);

  const wsMessage = useWebSocket(id);

  useEffect(() => {
    fetchTournament();
    fetchStandings();
  }, [id]);

  useEffect(() => {
    if (tournament?.stream_link) {
      setStreamUrl(tournament.stream_link);
    }
  }, [tournament]);

  useEffect(() => {
    if (
      wsMessage &&
      (wsMessage.type === "match_update" || wsMessage.type === "match_event")
    ) {
      fetchTournament();
      fetchStandings();
    }
  }, [wsMessage]);

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      setTournament(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStandings = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/standings`);
      setStandings(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    try {
      const s1 = parseInt(editScore1) || 0;
      const s2 = parseInt(editScore2) || 0;
      await api.put(`/matches/${editingMatch.id}/score`, {
        team1_score: s1,
        team2_score: s2,
      });
      setScoreModalOpen(false);
      fetchTournament();
      fetchStandings();
    } catch (err) {
      console.error("Score Update Error:", err.response?.data || err.message);
      alert(`Failed to update score: ${err.response?.data?.error || err.message}`);
    }
  };

  const fetchMyTeams = async () => {
    try {
      const res = await teamService.listMy();
      setMyTeams(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tournaments/${id}/teams`, { name: teamName });
      setTeamName("");
      setTeamModalOpen(false);
      fetchTournament();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add team");
    }
  };

  const handleRemoveTeam = async (teamId) => {
    if (!window.confirm("Remove this squad from the tournament?")) return;
    try {
      await api.delete(`/tournaments/${id}/teams/${teamId}`);
      fetchTournament();
    } catch (err) {
      alert("Failed to remove squad");
    }
  };

  const handlePay = async () => {
    try {
      const res = await api.post("/payment/stripe/pay", {
        amount: tournament.entry_fee,
        currency: "USD",
      });
      window.open(res.data.url, "_blank");
      setHasPaid(true);
      alert("Payment successful (Mock)! You can now complete registration.");
    } catch (err) {
      alert("Payment failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (tournament.entry_fee > 0 && !hasPaid) {
      alert("Please pay the entry fee first");
      return;
    }
    const team = myTeams.find((t) => t.id === selectedTeamId);
    if (!team) return;
    try {
      await api.post(`/tournaments/${id}/register`, {
        team_id: team.id,
        team_name: team.name,
        join_code: joinCode,
      });
      setRegisterModalOpen(false);
      fetchTournament();
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    }
  };

  const handleAddNews = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tournaments/${id}/news`, {
        title: newsTitle,
        content: newsContent,
      });
      setNewsTitle("");
      setNewsContent("");
      setNewsModalOpen(false);
      fetchTournament();
    } catch (err) {
      alert("Failed to post news");
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tournaments/${id}/rules`, { content: ruleContent });
      setRuleContent("");
      setRuleModalOpen(false);
      fetchTournament();
    } catch (err) {
      alert("Failed to add rule");
    }
  };

  const handleAddPrize = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tournaments/${id}/prizes`, {
        rank: prizeRank,
        value: prizeValue,
      });
      setPrizeRank("");
      setPrizeValue("");
      setPrizeModalOpen(false);
      fetchTournament();
    } catch (err) {
      alert("Failed to add prize");
    }
  };

  const handleDeletePrize = async (prizeId) => {
    if (!window.confirm("Delete this prize?")) return;
    try {
      await api.delete(`/tournaments/${id}/prizes/${prizeId}`);
      fetchTournament();
    } catch (err) {
      alert("Failed to delete prize");
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await api.delete(`/tournaments/${id}/rules/${ruleId}`);
      fetchTournament();
    } catch (err) {
      alert("Failed to delete rule");
    }
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm("Delete this broadcast?")) return;
    try {
      await api.delete(`/tournaments/${id}/news/${newsId}`);
      fetchTournament();
    } catch (err) {
      alert("Failed to delete broadcast");
    }
  };

  const generate = async () => {
    try {
      await api.post(`/tournaments/${id}/generate`);
      fetchTournament();
      fetchStandings();
    } catch (err) {
      alert("Generation failed");
    }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm("ARE YOU ABSOLUTELY SURE? This will PERMANENTLY delete the arena and all matches/data.")) return;
    try {
      await api.delete(`/tournaments/${id}`);
      navigate("/");
    } catch (err) {
      alert("Deletion failed");
    }
  };

  const promote = async () => {
    try {
      await api.post(`/tournaments/${id}/promote`);
      fetchTournament();
      fetchStandings();
      alert("Promoted top teams to knockout stage!");
    } catch (err) {
      alert("Promotion failed: " + (err.response?.data?.error || err.message));
    }
  };

  if (!tournament)
    return (
      <div className="p-12 text-center text-gray-400 font-bold text-xl animate-pulse tracking-widest uppercase">
        Initializing Sector...
      </div>
    );

  const isOwner =
    currentUser?.user_id === tournament.creator_id ||
    currentUser?.is_admin;

  const groupedMatches =
    tournament.matches?.reduce((acc, match) => {
      const stageKey = match.stage === 1 ? "Knockout Stage" : "Group Phase";
      if (!acc[stageKey]) acc[stageKey] = {};
      const round = match.round || 1;
      if (!acc[stageKey][round]) acc[stageKey][round] = [];
      acc[stageKey][round].push(match);
      return acc;
    }, {}) || {};

  const getRoundName = (round, stage, totalRoundsInStage) => {
    if (stage === "Group Phase") return `Matchday ${round}`;
    if (round === totalRoundsInStage) return "Grand Final";
    if (round === totalRoundsInStage - 1) return "Semifinals";
    if (round === totalRoundsInStage - 2) return "Quarterfinals";
    return `Round ${round}`;
  };

  const groupedStandings = standings.reduce((acc, s) => {
    const groupName = s.group_name || "Overall";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(s);
    return acc;
  }, {});

  const tabs = [
    { id: "matches", label: "Matches", icon: Calendar },
    { id: "standings", label: "Standings", icon: Trophy },
    { id: "teams", label: "Teams", icon: Users },
    { id: "news", label: "Broadcasts", icon: Newspaper },
    { id: "info", label: "Intel", icon: ScrollText },
    { id: "live", label: "Live Stream", icon: Tv },
  ].filter((tab) => {
    if (tab.id === "standings" && tournament?.type === "knockout") return false;
    return true;
  });

  const handleUpdateStream = async () => {
    try {
      await api.put(`/tournaments/${id}`, { stream_link: streamUrl });
      fetchTournament();
      alert("Stream link updated");
    } catch (err) {
      alert("Failed to update stream");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-2xl w-12 h-12 p-0"
          >
            <Link to="/">
              <ChevronRight className="rotate-180" size={24} />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-5xl font-black tracking-tighter uppercase italic">
                {tournament.name}
              </h1>
              <Badge
                variant="outline"
                className="h-8 px-4 rounded-full border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest"
              >
                {tournament.sport}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">
              {tournament.is_public ? (
                <span className="flex items-center gap-1.5 text-green-500">
                  <Globe size={12} /> Public Arena
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-orange-500">
                  <Lock size={12} /> Private Sector
                </span>
              )}
              <Separator orientation="vertical" className="h-3" />
              <span>Format: {tournament.type}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>
                Mode:{" "}
                {tournament.mode === "self"
                  ? "Organizer Managed"
                  : "Open Registration"}
              </span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex gap-3">
            <Button
              onClick={handleDeleteTournament}
              variant="ghost"
              className="h-14 w-14 rounded-2xl text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={24} />
            </Button>
            {tournament.type === "group" && tournament.matches?.length > 0 && (
              <Button
                onClick={promote}
                variant="outline"
                className="h-14 px-8 rounded-2xl font-black border-primary/20 text-primary gap-3"
              >
                <Award size={18} /> PROMOTE TO KNOCKOUT
              </Button>
            )}
            <Button
              onClick={generate}
              className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-primary/20 gap-3 group"
            >
              <Play
                className="group-hover:scale-110 transition-transform"
                size={18}
                fill="currentColor"
              />
              {tournament.matches?.length > 0
                ? "REGENERATE ENGINE"
                : "INITIALIZE SEASON"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2 bg-muted/40 p-2 rounded-[2rem] w-fit border border-border/50 backdrop-blur-md sticky top-0 z-40">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            className={cn(
              "rounded-[1.5rem] gap-3 px-8 font-black text-xs uppercase tracking-widest transition-all h-12",
              activeTab === tab.id
                ? "shadow-xl shadow-primary/20 bg-card text-primary"
                : "text-muted-foreground",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "matches" && (
          <div className="space-y-20 max-w-5xl mx-auto">
            {Object.keys(groupedMatches).length === 0 ? (
              <Card className="border-dashed border-4 bg-transparent py-40 text-center rounded-[4rem] space-y-8">
                <div className="space-y-4">
                  <Activity
                    size={80}
                    className="mx-auto text-muted-foreground/10 animate-pulse"
                  />
                  <p className="text-3xl font-black text-muted-foreground/30 uppercase tracking-[0.3em] italic">
                    Engine Awaiting Input
                  </p>
                </div>
                {isOwner && (
                  <Button
                    onClick={generate}
                    size="lg"
                    className="h-16 px-12 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 mx-auto"
                  >
                    <Play fill="currentColor" size={20} /> INITIALIZE MATCH
                    ENGINE
                  </Button>
                )}
              </Card>
            ) : (
              Object.keys(groupedMatches)
                .reverse()
                .map((stage) => (
                  <div key={stage} className="space-y-12">
                    <div className="flex items-center gap-8">
                      <h2 className="text-4xl font-black uppercase tracking-tighter italic text-primary">
                        {stage}
                      </h2>
                      <div className="h-px bg-gradient-to-r from-primary/20 to-transparent flex-1" />
                    </div>
                    {Object.keys(groupedMatches[stage])
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((round) => (
                        <div key={round} className="space-y-8">
                          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.5em] flex items-center gap-6">
                            <div className="w-12 h-px bg-muted-foreground/20" />
                            {getRoundName(
                              parseInt(round),
                              stage,
                              Object.keys(groupedMatches[stage]).length,
                            )}
                            <div className="w-12 h-px bg-muted-foreground/20" />
                          </h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {[...groupedMatches[stage][round]]
                              .sort(
                                (a, b) =>
                                  (a.group_name || "").localeCompare(
                                    b.group_name || "",
                                  ) || a.id.localeCompare(b.id),
                              )
                              .map((match) => {
                                const t1 = tournament.teams.find(
                                  (t) => t.squad_id === match.team1_id,
                                );
                                const t2 = tournament.teams.find(
                                  (t) => t.squad_id === match.team2_id,
                                );

                                return (
                                  <Card
                                    key={match.id}
                                    className={cn(
                                      "group relative overflow-hidden rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-card",
                                      isOwner && "cursor-pointer active:scale-95"
                                    )}
                                    onClick={() => {
                                      if (isOwner) {
                                        setEditingMatch(match);
                                        setEditScore1(match.team1_score);
                                        setEditScore2(match.team2_score);
                                        setScoreModalOpen(true);
                                      }
                                    }}
                                  >
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10 group-hover:bg-primary transition-colors" />
                                    <CardContent className="p-10 flex flex-col gap-8">

                                      <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                          <span
                                            className={cn(
                                              "text-2xl font-black tracking-tighter uppercase italic truncate flex-1",
                                              match.winner_id === match.team1_id
                                                ? "text-primary"
                                                : "text-foreground",
                                            )}
                                          >
                                            {t1?.name ||
                                              (match.stage === 1
                                                ? "PENDING"
                                                : "BYE")}
                                          </span>
                                          <div className="w-14 h-14 bg-muted/30 rounded-2xl flex items-center justify-center font-black text-3xl text-primary shadow-inner">
                                            {match.team1_score}
                                          </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span
                                            className={cn(
                                              "text-2xl font-black tracking-tighter uppercase italic truncate flex-1",
                                              match.winner_id === match.team2_id
                                                ? "text-primary"
                                                : "text-foreground",
                                            )}
                                          >
                                            {t2?.name ||
                                              (match.stage === 1
                                                ? "PENDING"
                                                : "BYE")}
                                          </span>
                                          <div className="w-14 h-14 bg-muted/30 rounded-2xl flex items-center justify-center font-black text-3xl text-primary shadow-inner">
                                            {match.team2_score}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center pt-4 border-t border-border/50">
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] uppercase font-black bg-muted/50 tracking-widest px-4 h-7 rounded-full"
                                        >
                                          {match.status}{" "}
                                          {match.group_name &&
                                            `• SEC ${match.group_name}`}
                                        </Badge>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                  </div>
                ))
                )}

                {/* Score Update Dialog */}
                <Dialog open={scoreModalOpen} onOpenChange={setScoreModalOpen}>
                <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-lg">
                <DialogHeader className="bg-primary p-10 text-primary-foreground">
                  <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                    Update Score
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                    Manually override match results
                  </DialogDescription>
                </DialogHeader>
                {editingMatch && (
                  <form onSubmit={handleUpdateScore} className="p-10 space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground block text-center">
                          {tournament.teams.find(t => t.squad_id === editingMatch.team1_id)?.name || 'Team 1'}
                        </Label>
                        <Input
                          type="number"
                          className="h-20 rounded-2xl font-black text-4xl text-center shadow-inner"
                          value={editScore1}
                          onChange={(e) => setEditScore1(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-4">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground block text-center">
                          {tournament.teams.find(t => t.squad_id === editingMatch.team2_id)?.name || 'Team 2'}
                        </Label>
                        <Input
                          type="number"
                          className="h-20 rounded-2xl font-black text-4xl text-center shadow-inner"
                          value={editScore2}
                          onChange={(e) => setEditScore2(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20"
                      >
                        FINALIZE SCORE
                      </Button>
                    </DialogFooter>
                  </form>
                )}
                </DialogContent>
                </Dialog>
                </div>
                )}
        {activeTab === "standings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {Object.keys(groupedStandings)
              .sort()
              .map((groupName) => (
                <div key={groupName} className="space-y-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4 pl-4">
                    <div className="w-2 h-10 bg-primary rounded-full shadow-lg shadow-primary/20" />
                    {groupName === "Overall"
                      ? "Global Standings"
                      : `Sector ${groupName}`}
                  </h2>
                  <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-none h-16">
                          <TableHead className="pl-10 font-black text-[11px] uppercase tracking-[0.2em]">
                            Competitor
                          </TableHead>
                          <TableHead className="text-center font-black text-[11px] uppercase tracking-[0.2em] w-16">
                            P
                          </TableHead>
                          <TableHead className="text-center font-black text-[11px] uppercase tracking-[0.2em] w-16">
                            GD
                          </TableHead>
                          <TableHead className="text-center font-black text-[11px] uppercase tracking-[0.2em] w-24 text-primary">
                            Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedStandings[groupName]
                          .sort((a, b) => b.points - a.points || b.gd - a.gd)
                          .map((s) => (
                            <TableRow
                              key={s.team_id}
                              className="h-24 border-border/40 transition-colors"
                            >
                              <TableCell className="pl-10 font-black text-2xl tracking-tighter uppercase italic">
                                {s.team_name}
                              </TableCell>
                              <TableCell className="text-center font-bold text-muted-foreground text-lg">
                                {s.played}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-center font-black text-lg",
                                  s.gd > 0
                                    ? "text-green-500"
                                    : s.gd < 0
                                      ? "text-red-500"
                                      : "text-muted-foreground",
                                )}
                              >
                                {s.gd > 0 ? `+${s.gd}` : s.gd}
                              </TableCell>
                              <TableCell className="text-center font-black text-primary text-3xl italic">
                                {s.points}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              ))}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="flex justify-between items-center px-4">
              <div className="space-y-1">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                  Squad Roster
                </h2>
                <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                  {tournament.teams?.length} / {tournament.max_teams} Slots
                  Occupied
                </p>
              </div>

              {/* Team Management Trigger */}
              {isOwner && (
                <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="h-14 rounded-2xl font-black gap-3 shadow-xl shadow-primary/20"
                    >
                      <Plus />{" "}
                      {tournament.mode === "self"
                        ? "ADD SQUAD"
                        : "MANUAL ENTRY"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="bg-primary p-10 text-primary-foreground">
                      <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                        Squad Entry
                      </DialogTitle>
                      <DialogDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                        Manually register a competitor into the arena
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTeam} className="p-10 space-y-6">
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          Competitor Name
                        </Label>
                        <Input
                          placeholder="E.g. Alpha Unit"
                          className="h-14 rounded-2xl font-black text-lg"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4"
                        >
                          ENLIST SQUAD
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {/* Registration Trigger */}
              {tournament.mode === "registration" && (
                <Dialog
                  open={registerModalOpen}
                  onOpenChange={(val) => {
                    setRegisterModalOpen(val);
                    if (val) fetchMyTeams();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      variant={isOwner ? "outline" : "default"}
                      className="h-14 rounded-2xl font-black gap-3 shadow-xl shadow-primary/20"
                    >
                      <UserPlus /> REGISTER MY SQUAD
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="bg-primary p-10 text-primary-foreground">
                      <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                        Arena Entry
                      </DialogTitle>
                      <DialogDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                        Submit your squad for competition
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="p-10 space-y-8">
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          Select Your Unit
                        </Label>
                        <div className="grid gap-3">
                          {myTeams
                            .filter((t) => t.sport === tournament.sport)
                            .map((t) => (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTeamId(t.id)}
                                className={cn(
                                  "p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center",
                                  selectedTeamId === t.id
                                    ? "border-primary bg-primary/5 shadow-lg"
                                    : "border-border/50 hover:border-primary/30",
                                )}
                              >
                                <span className="font-black text-lg uppercase tracking-tight">
                                  {t.name}
                                </span>
                                {selectedTeamId === t.id && (
                                  <ShieldCheck className="text-primary" />
                                )}
                              </div>
                            ))}
                          {myTeams.filter((t) => t.sport === tournament.sport)
                            .length === 0 && (
                            <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed">
                              <p className="font-bold text-muted-foreground uppercase text-xs">
                                No matching squads found for this discipline
                              </p>
                              <Button
                                asChild
                                variant="link"
                                className="mt-2 text-primary font-black"
                              >
                                <Link to="/teams">CREATE ONE NOW</Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {!tournament.is_public && (
                        <div className="space-y-2">
                          <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                            Security Code
                          </Label>
                          <Input
                            placeholder="Enter Join Code"
                            className="h-14 rounded-2xl font-black text-lg"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      {tournament.entry_fee > 0 && (
                        <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/20 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                              Entry Fee Required
                            </span>
                            <span className="text-2xl font-black text-primary italic">
                              ${tournament.entry_fee}
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={handlePay}
                            disabled={hasPaid}
                            className={cn(
                              "w-full h-12 rounded-xl font-black transition-all",
                              hasPaid
                                ? "bg-green-500 hover:bg-green-600 shadow-green-500/20"
                                : "shadow-primary/20",
                            )}
                          >
                            {hasPaid ? (
                              <div className="flex items-center gap-2">
                                <ShieldCheck size={18} /> FEE VERIFIED
                              </div>
                            ) : (
                              "PAY ENTRY FEE"
                            )}
                          </Button>
                        </div>
                      )}

                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={
                            !selectedTeamId ||
                            (tournament.entry_fee > 0 && !hasPaid)
                          }
                          className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                        >
                          CONFIRM REGISTRATION
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tournament.teams?.map((t) => (
                <Card
                  key={t.id}
                  className="rounded-[3rem] border-none shadow-xl bg-card group overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10 group-hover:bg-primary transition-colors" />
                  <CardContent className="p-10 flex flex-col gap-6">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black uppercase tracking-tighter italic">
                        {t.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="font-black text-[9px] uppercase tracking-[0.2em] bg-muted/50 px-3"
                      >
                        {t.group_name
                          ? `Sector ${t.group_name}`
                          : "Awaiting Sector"}
                      </Badge>
                    </div>
                    <div className="flex gap-4">
                      {!t.is_manual && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-xl font-bold border-primary/20 text-primary flex-1"
                        >
                          <Link to={`/team/${t.squad_id}`}>
                            INTEL <ChevronRight size={14} className="ml-1" />
                          </Link>
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeam(t.id)}
                          className={cn(
                            "w-10 h-10 p-0 text-destructive hover:bg-destructive/10 rounded-xl",
                            t.is_manual && "flex-1 w-full h-11"
                          )}
                        >
                          <Trash2 size={16} /> {t.is_manual && <span className="ml-2 font-bold uppercase text-[10px]">Remove Squad</span>}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!tournament.teams || tournament.teams.length === 0) && (
                <div className="col-span-2 py-40 text-center space-y-6 bg-muted/10 rounded-[4rem] border-4 border-dashed border-border/50">
                  <Users
                    size={64}
                    className="mx-auto text-muted-foreground/10"
                  />
                  <p className="text-muted-foreground font-black uppercase text-xs tracking-[0.4em]">
                    Arena Empty - Awaiting Competitors
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "news" && (
          <div className="max-w-3xl mx-auto space-y-12">
            <header className="flex justify-between items-center px-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                News Feed
              </h2>
              {isOwner && (
                <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="h-14 rounded-2xl font-black gap-3 shadow-xl shadow-primary/20"
                    >
                      <Megaphone size={18} /> BROADCAST
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="bg-primary p-10 text-primary-foreground">
                      <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                        Push Update
                      </DialogTitle>
                      <DialogDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                        Transmit a global message to all competitors
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddNews} className="p-10 space-y-6">
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          Headline
                        </Label>
                        <Input
                          placeholder="Transmission Title"
                          className="h-14 rounded-2xl font-black text-lg"
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          Data Body
                        </Label>
                        <textarea
                          className="w-full min-h-[150px] p-6 bg-muted/20 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-base shadow-inner"
                          placeholder="Enter transmission content..."
                          value={newsContent}
                          onChange={(e) => setNewsContent(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4"
                        >
                          INITIATE BROADCAST
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </header>

            <div className="space-y-12">
              {tournament.news
                ?.sort((a, b) => b.id - a.id)
                .map((n) => (
                  <div key={n.id} className="relative group pl-10">
                    <div className="absolute left-0 top-0 w-1.5 h-full bg-primary/10 rounded-full group-hover:bg-primary transition-all" />
                    <div className="space-y-4">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-3xl font-black tracking-tighter uppercase italic">
                          {n.title}
                        </h3>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                          {isOwner && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteNews(n.id)}
                              className="w-8 h-8 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground font-bold text-lg leading-relaxed">
                        {n.content}
                      </p>
                      <div className="flex items-center gap-3 text-[9px] font-black text-primary/40 uppercase tracking-widest">
                        <ShieldCheck size={12} /> Verified Arena Broadcaster
                      </div>
                    </div>
                  </div>
                ))}
              {(!tournament.news || tournament.news.length === 0) && (
                <div className="py-40 text-center opacity-10 font-black text-6xl uppercase tracking-tighter italic">
                  Silence
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-6xl mx-auto">
            <section className="space-y-10">
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-6">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-3xl flex items-center justify-center text-yellow-600 shadow-xl">
                    <Trophy size={32} />
                  </div>
                  Prizing Tiers
                </h2>
                {isOwner && (
                  <Dialog
                    open={prizeModalOpen}
                    onOpenChange={setPrizeModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-black gap-2 border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/5"
                      >
                        <Plus size={16} /> ADD PRIZE
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                      <DialogHeader className="bg-yellow-500 p-10 text-white">
                        <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                          Prize Definition
                        </DialogTitle>
                        <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                          Specify rewards for top performing squads
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={handleAddPrize}
                        className="p-10 space-y-6"
                      >
                        <div className="space-y-2">
                          <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                            Rank / Position
                          </Label>
                          <Input
                            placeholder="E.g. Champion, 1st Place, MVP"
                            className="h-14 rounded-2xl font-black text-lg"
                            value={prizeRank}
                            onChange={(e) => setPrizeRank(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                            Reward Value
                          </Label>
                          <Input
                            placeholder="E.g. $5,000, Trophy + Kit"
                            className="h-14 rounded-2xl font-black text-lg text-primary"
                            value={prizeValue}
                            onChange={(e) => setPrizeValue(e.target.value)}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-yellow-500/20 mt-4 bg-yellow-500 hover:bg-yellow-600"
                          >
                            COMMIT PRIZE
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="grid gap-6">
                {tournament.prizes_list?.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-8 bg-card rounded-[2.5rem] shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="font-black text-muted-foreground uppercase text-[10px] tracking-[0.3em]">
                      {p.rank}
                    </span>
                    <span className="font-black text-3xl text-primary tracking-tighter italic">
                      {p.value}
                    </span>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePrize(p.id)}
                        className="absolute top-2 right-2 w-8 h-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                {tournament.prizes_list?.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground font-black uppercase text-xs tracking-widest bg-muted/10 rounded-[3rem] border-2 border-dashed">
                    No prizing data reported
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-10">
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-xl">
                    <ScrollText size={32} />
                  </div>
                  Arena Rules
                </h2>
                {isOwner && (
                  <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-black gap-2 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <Plus size={16} /> ADD RULE
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                      <DialogHeader className="bg-primary p-10 text-white">
                        <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">
                          Rule Implementation
                        </DialogTitle>
                        <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-2">
                          Establish conduct and gameplay protocols
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddRule} className="p-10 space-y-6">
                        <div className="space-y-2">
                          <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                            Rule Description
                          </Label>
                          <textarea
                            className="w-full min-h-[120px] p-6 bg-muted/20 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-base shadow-inner"
                            placeholder="E.g. No professional players allowed, 5 mins per half..."
                            value={ruleContent}
                            onChange={(e) => setRuleContent(e.target.value)}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4"
                          >
                            ADD TO PROTOCOL
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="bg-card rounded-[3.5rem] p-12 space-y-8 shadow-2xl border-none">
                {tournament.rules_list?.map((r, idx) => (
                  <div key={r.id} className="flex gap-6 group relative">
                    <div className="w-8 h-8 bg-primary/20 text-primary font-black rounded-2xl flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                      {idx + 1}
                    </div>
                    <p className="font-bold text-gray-700 dark:text-gray-300 leading-relaxed text-lg italic uppercase tracking-tight flex-1">
                      {r.content}
                    </p>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(r.id)}
                        className="w-8 h-8 text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                {tournament.rules_list?.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground font-black uppercase text-xs tracking-widest italic">
                    Standard conduct applied
                  </p>
                )}
              </div>
            </section>
            </div>
            )}

        {activeTab === "live" && (
          <div className="max-w-5xl mx-auto space-y-12">
            {isOwner && (
              <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-card">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground ml-1">
                      Satellite Feed URL (Live Stream Link)
                    </Label>
                    <Input
                      placeholder="E.g. https://youtube.com/live/..."
                      className="h-14 rounded-2xl font-black"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleUpdateStream}
                    className="h-14 px-8 rounded-2xl font-black shadow-lg shadow-primary/20"
                  >
                    LINK SIGNAL
                  </Button>
                </div>
              </Card>
            )}

            {tournament.stream_link ? (
              <Card className="aspect-video bg-black rounded-[4rem] overflow-hidden border-[12px] border-card shadow-2xl relative group">
                {tournament.stream_link.includes("youtube.com") ||
                tournament.stream_link.includes("youtu.be") ? (
                  <iframe
                    className="w-full h-full"
                    src={tournament.stream_link.replace("watch?v=", "embed/")}
                    title="Live Stream"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                    <Tv size={64} className="text-primary animate-pulse" />
                    <p className="text-2xl font-black uppercase italic tracking-tighter">
                      External Signal Detected
                    </p>
                    <Button asChild size="lg" className="rounded-2xl font-black">
                      <a
                        href={tournament.stream_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        OPEN SATELLITE FEED <ExternalLink className="ml-2" />
                      </a>
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="aspect-video bg-[#050505] rounded-[4rem] overflow-hidden flex items-center justify-center border-[12px] border-card shadow-2xl relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="text-center space-y-8 relative z-10">
                  <div className="w-32 h-32 bg-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)] transform rotate-6 hover:rotate-0 transition-transform duration-500">
                    <Tv className="text-white w-16 h-16" />
                  </div>
                  <div>
                    <p className="text-white font-black text-5xl uppercase tracking-tighter italic shadow-2xl">
                      Signal Lost
                    </p>
                    <p className="text-red-500/60 font-black uppercase text-xs tracking-[0.5em] mt-4">
                      Awaiting Satellite Feed ...
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
            </div>
            </div>
            );
            };

            export default TournamentDetailsPage;

