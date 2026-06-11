import { useState, useEffect } from "react";
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
  Trash2,
  ChevronRight,
  Calendar,
  ScrollText,
  Newspaper,
  Tv,
  ExternalLink,
  Lock,
  Globe,
  UserPlus,
  ShieldCheck,
  Activity,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
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
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [activeTab, setActiveTab] = useState("matches");

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [ruleContent, setRuleContent] = useState("");
  const [prizeRank, setPrizeRank] = useState("");
  const [prizeValue, setPrizeValue] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [myTeams, setMyTeams] = useState([]);
  const [streamUrl, setStreamUrl] = useState("");

  const [editingMatch, setEditingMatch] = useState(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);

  const wsMessage = useWebSocket(id);

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

  const fetchMyTeams = async () => {
    try {
      const res = await teamService.listMy();
      setMyTeams(res.data || []);
      if (res.data?.length > 0) {
        setSelectedTeamId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTournament();
    fetchStandings();
    fetchMyTeams();
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
      alert(
        `Failed to update score: ${err.response?.data?.error || err.message}`,
      );
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
    } catch {
      alert("Failed to remove squad");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
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
    } catch {
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
    } catch {
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
    } catch {
      alert("Failed to add prize");
    }
  };

  const handleDeletePrize = async (prizeId) => {
    if (!window.confirm("Delete this prize?")) return;
    try {
      await api.delete(`/tournaments/${id}/prizes/${prizeId}`);
      fetchTournament();
    } catch {
      alert("Failed to delete prize");
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await api.delete(`/tournaments/${id}/rules/${ruleId}`);
      fetchTournament();
    } catch {
      alert("Failed to delete rule");
    }
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm("Delete this broadcast?")) return;
    try {
      await api.delete(`/tournaments/${id}/news/${newsId}`);
      fetchTournament();
    } catch {
      alert("Failed to delete broadcast");
    }
  };

  const generate = async () => {
    try {
      await api.post(`/tournaments/${id}/generate`);
      fetchTournament();
      fetchStandings();
    } catch {
      alert("Generation failed");
    }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm("ARE YOU ABSOLUTELY SURE?")) return;
    try {
      await api.delete(`/tournaments/${id}`);
      navigate("/dashboard");
    } catch {
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
      <div className="p-24 text-center font-black uppercase tracking-[0.5em] animate-pulse">
        Initializing Sector Intelligence...
      </div>
    );

  const isOwner =
    currentUser?.user_id === tournament.creator_id || currentUser?.is_admin;

  const groupedMatches =
    tournament.matches?.reduce((acc, match) => {
      const stageKey = match.stage === 1 ? "Knockout" : "Group Phase";
      if (!acc[stageKey]) acc[stageKey] = {};
      const round = match.round || 1;
      if (!acc[stageKey][round]) acc[stageKey][round] = [];
      acc[stageKey][round].push(match);
      return acc;
    }, {}) || {};

  const getRoundName = (round, stage, totalRoundsInStage) => {
    if (stage === "Group Phase") return `MATCHDAY_${round}`;
    if (round === totalRoundsInStage) return "GRAND_FINAL";
    if (round === totalRoundsInStage - 1) return "SEMIFINALS";
    if (round === totalRoundsInStage - 2) return "QUARTERFINALS";
    return `ROUND_${round}`;
  };

  const groupedStandings = standings.reduce((acc, s) => {
    const groupName = s.group_name || "Overall";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(s);
    return acc;
  }, {});

  const tabs = [
    { id: "matches", label: "01. Matches", icon: Calendar },
    { id: "standings", label: "02. Matrix", icon: Trophy },
    { id: "teams", label: "03. Squads", icon: Users },
    { id: "news", label: "04. Comms", icon: Newspaper },
    { id: "info", label: "05. Intel", icon: ScrollText },
    { id: "live", label: "06. Stream", icon: Tv },
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
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-l-8 border-foreground pl-12 py-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h1 className="text-6xl font-black tracking-tighter italic uppercase leading-none">
              {tournament.name}
            </h1>
            <Badge variant="outline">{tournament.sport}</Badge>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-50 italic">
            {tournament.is_public ? (
              <span className="flex items-center gap-2 text-foreground">
                <Globe size={14} /> Global Access
              </span>
            ) : (
              <span className="flex items-center gap-2 text-foreground">
                <Lock size={14} /> Restricted Sector
              </span>
            )}
            <Separator
              orientation="vertical"
              className="h-4 w-0.5 bg-foreground"
            />
            <span>Format: {tournament.type}</span>
            <Separator
              orientation="vertical"
              className="h-4 w-0.5 bg-foreground"
            />
            <span>ID: {String(tournament.id || "").split("-")[0]}</span>
          </div>
        </div>

        {isOwner && (
          <div className="flex gap-4">
            <Button
              onClick={handleDeleteTournament}
              variant="outline"
              className="h-20 w-20 border-2"
            >
              <Trash2 size={24} strokeWidth={2.5} />
            </Button>
            {tournament.type === "group" && tournament.matches?.length > 0 && (
              <Button
                onClick={promote}
                variant="outline"
                className="h-20 px-8 border-2 font-black italic"
              >
                PROMOTE_UNITS
              </Button>
            )}
            <Button
              onClick={generate}
              className="h-20 px-10 font-black italic uppercase italic tracking-tighter"
            >
              {tournament.matches?.length > 0 ? "REGEN_ENGINE" : "INIT_ARENA"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 bg-foreground border-2 border-foreground sticky top-0 z-40">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex-1 p-6 text-[10px] font-black uppercase tracking-[0.3em] transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground"
                : "bg-foreground text-background hover:bg-muted/10",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-12">
        {activeTab === "matches" && (
          <div className="space-y-32">
            {Object.keys(groupedMatches).length === 0 ? (
              <div className="py-48 text-center border-4 border-foreground border-dashed max-w-2xl mx-auto space-y-12">
                <Activity
                  size={80}
                  strokeWidth={1}
                  className="mx-auto opacity-10"
                />
                <p className="text-3xl font-black uppercase tracking-tighter italic opacity-20">
                  Engine_Awaiting_Initialization
                </p>
                {isOwner && (
                  <Button onClick={generate} size="lg" className="h-20 px-12">
                    Start Match Engine
                  </Button>
                )}
              </div>
            ) : (
              Object.keys(groupedMatches)
                .reverse()
                .map((stage) => (
                  <div key={stage} className="space-y-16">
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter border-b-8 border-foreground pb-4">
                      {stage}
                    </h2>
                    {Object.keys(groupedMatches[stage])
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((round) => (
                        <div key={round} className="space-y-8">
                          <h3 className="text-[10px] font-black opacity-30 uppercase tracking-[0.5em] flex items-center gap-6">
                            {getRoundName(
                              parseInt(round),
                              stage,
                              Object.keys(groupedMatches[stage]).length,
                            )}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 bg-foreground border-2 border-foreground">
                            {groupedMatches[stage][round].map((match) => {
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
                                    "border-none p-10 bg-background rounded-none hover:bg-muted transition-colors",
                                    isOwner && "cursor-pointer",
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
                                  <div className="space-y-8">
                                    <div className="flex justify-between items-center">
                                      <span
                                        className={cn(
                                          "text-2xl font-black italic uppercase truncate",
                                          match.winner_id === match.team1_id
                                            ? "underline decoration-4 underline-offset-8"
                                            : "opacity-60",
                                        )}
                                      >
                                        {t1?.name || "TBD"}
                                      </span>
                                      <div className="text-4xl font-black italic">
                                        {match.team1_score}
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span
                                        className={cn(
                                          "text-2xl font-black italic uppercase truncate",
                                          match.winner_id === match.team2_id
                                            ? "underline decoration-4 underline-offset-8"
                                            : "opacity-60",
                                        )}
                                      >
                                        {t2?.name || "TBD"}
                                      </span>
                                      <div className="text-4xl font-black italic">
                                        {match.team2_score}
                                      </div>
                                    </div>
                                    <div className="pt-6 border-t-2 border-foreground/10 flex justify-between items-center">
                                      <Badge variant="outline">
                                        {match.status}
                                      </Badge>
                                      {match.group_name && (
                                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">
                                          Sector {match.group_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                ))
            )}

            <Dialog open={scoreModalOpen} onOpenChange={setScoreModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Override Result</DialogTitle>
                </DialogHeader>
                {editingMatch && (
                  <form
                    onSubmit={handleUpdateScore}
                    className="space-y-12 py-8"
                  >
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="text-center block">
                          Team 1 Score
                        </Label>
                        <Input
                          type="number"
                          className="h-20 text-4xl text-center"
                          value={editScore1}
                          onChange={(e) => setEditScore1(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-4">
                        <Label className="text-center block">
                          Team 2 Score
                        </Label>
                        <Input
                          type="number"
                          className="h-20 text-4xl text-center"
                          value={editScore2}
                          onChange={(e) => setEditScore2(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        className="w-full h-20 text-xl italic uppercase"
                      >
                        Finalize Override
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === "standings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-foreground border-2 border-foreground">
            {Object.keys(groupedStandings)
              .sort()
              .map((groupName) => (
                <Card key={groupName} className="border-none rounded-none p-0">
                  <CardHeader className="bg-secondary p-8 border-none">
                    <CardTitle className="text-3xl tracking-tighter italic uppercase">
                      {groupName === "Overall"
                        ? "Global Matrix"
                        : `Sector_${groupName}`}
                    </CardTitle>
                  </CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow className="h-16">
                        <TableHead>Competitor</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">GD</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedStandings[groupName]
                        .sort((a, b) => b.points - a.points || b.gd - a.gd)
                        .map((s) => (
                          <TableRow key={s.team_id} className="h-20">
                            <TableCell className="text-xl font-black italic uppercase">
                              {s.team_name}
                            </TableCell>
                            <TableCell className="text-center opacity-40">
                              {s.played}
                            </TableCell>
                            <TableCell className="text-center font-black">
                              {s.gd > 0 ? `+${s.gd}` : s.gd}
                            </TableCell>
                            <TableCell className="text-center text-3xl font-black italic">
                              {s.points}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </Card>
              ))}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="max-w-4xl mx-auto space-y-20">
            <header className="flex justify-between items-end border-b-8 border-foreground pb-6">
              <div className="space-y-2">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
                  Squad Roster
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {tournament.teams?.length} / {tournament.max_teams} units
                  enlisted
                </p>
              </div>

              {isOwner && (
                <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="h-16 gap-4 font-black italic">
                      <Plus size={20} strokeWidth={3} /> MANUAL_ENTRY
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enlist Squad</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTeam} className="space-y-8 py-6">
                      <div className="space-y-4">
                        <Label>Competitor Name</Label>
                        <Input
                          placeholder="E.G. ALPHA_UNIT"
                          className="h-16"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          className="w-full h-16 text-lg italic"
                        >
                          Commit Squad
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {tournament.mode === "registration" && (
                <Dialog
                  open={registerModalOpen}
                  onOpenChange={(v) => {
                    setRegisterModalOpen(v);
                    if (v) fetchMyTeams();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="lg" className="h-16 gap-4 font-black italic">
                      <UserPlus size={20} strokeWidth={3} /> REGISTER_MY_UNIT
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Arena Registration</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="space-y-12 py-8">
                      <div className="grid gap-2">
                        {myTeams
                          .filter((t) => t.sport === tournament.sport)
                          .map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTeamId(t.id)}
                              className={cn(
                                "p-8 border-2 cursor-pointer font-black uppercase tracking-tight text-xl italic transition-all",
                                selectedTeamId === t.id
                                  ? "bg-foreground text-background"
                                  : "hover:bg-muted",
                              )}
                            >
                              {t.name}
                            </div>
                          ))}
                      </div>
                      {!tournament.is_public && (
                        <div className="space-y-4">
                          <Label>Security Code</Label>
                          <Input
                            placeholder="Input Sector Code"
                            className="h-16"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            required
                          />
                        </div>
                      )}
                      <DialogFooter>
                        <Button
                          type="submit"
                          className="w-full h-20 text-xl italic"
                          disabled={!selectedTeamId}
                        >
                          Verify & Enlist
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 bg-foreground border-2 border-foreground">
              {tournament.teams?.map((t) => (
                <Card
                  key={t.id}
                  className="p-10 border-none bg-background rounded-none hover:bg-muted transition-colors flex flex-col justify-between h-64"
                >
                  <div className="space-y-2">
                    <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                      {t.name}
                    </h3>
                    <Badge variant="outline">
                      {t.group_name ? `Sector ${t.group_name}` : "UNASSIGNED"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {!t.is_manual && (
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 h-14 border-2 font-black italic"
                      >
                        <Link to={`/team/${t.squad_id}`}>VIEW_INTEL</Link>
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="outline"
                        className="h-14 w-14 border-2 text-destructive"
                        onClick={() => handleRemoveTeam(t.id)}
                      >
                        <Trash2 size={20} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "news" && (
          <div className="max-w-3xl mx-auto space-y-24">
            <header className="flex justify-between items-end border-b-8 border-foreground pb-6">
              <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
                Comms Feed
              </h2>
              {isOwner && (
                <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="h-16 italic font-black uppercase"
                    >
                      Push Broadcast
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Operational Broadcast</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddNews} className="space-y-8 py-6">
                      <Input
                        placeholder="Headline"
                        className="h-16 italic font-black uppercase"
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        required
                      />
                      <textarea
                        className="w-full min-h-[200px] p-6 border-2 border-foreground font-bold uppercase tracking-tight outline-none"
                        placeholder="Transmission Data..."
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value)}
                        required
                      />
                      <Button
                        type="submit"
                        className="w-full h-20 text-xl italic"
                      >
                        Initiate Broadcast
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </header>

            <div className="space-y-24">
              {tournament.news
                ?.sort((a, b) => b.id - a.id)
                .map((n) => (
                  <div
                    key={n.id}
                    className="border-l-8 border-foreground pl-12 space-y-6"
                  >
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
                        {n.title}
                      </h3>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNews(n.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                    <p className="text-xl font-bold uppercase leading-tight opacity-70">
                      {n.content}
                    </p>
                    <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.5em]">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 max-w-6xl mx-auto">
            <section className="space-y-12">
              <div className="flex justify-between items-end border-b-8 border-foreground pb-6">
                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                  Prizes
                </h2>
                {isOwner && (
                  <Button
                    variant="outline"
                    className="border-2 font-black italic"
                    onClick={() => setPrizeModalOpen(true)}
                  >
                    ADD_PRIZE
                  </Button>
                )}
              </div>
              <div className="grid gap-1 bg-foreground border-2 border-foreground">
                {tournament.prizes_list?.map((p) => (
                  <div
                    key={p.id}
                    className="bg-background p-10 flex justify-between items-center group"
                  >
                    <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">
                      {p.rank}
                    </span>
                    <span className="text-4xl font-black italic tracking-tighter">
                      {p.value}
                    </span>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeletePrize(p.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-12">
              <div className="flex justify-between items-end border-b-8 border-foreground pb-6">
                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                  Rules
                </h2>
                {isOwner && (
                  <Button
                    variant="outline"
                    className="border-2 font-black italic"
                    onClick={() => setRuleModalOpen(true)}
                  >
                    ADD_RULE
                  </Button>
                )}
              </div>
              <div className="space-y-12">
                {tournament.rules_list?.map((r, i) => (
                  <div key={r.id} className="flex gap-8 group">
                    <span className="text-4xl font-black italic opacity-10">
                      0{i + 1}
                    </span>
                    <p className="text-2xl font-black italic uppercase tracking-tighter leading-none flex-1">
                      {r.content}
                    </p>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteRule(r.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "live" && (
          <div className="max-w-5xl mx-auto space-y-12">
            {isOwner && (
              <div className="flex gap-1 border-2 border-foreground bg-foreground">
                <Input
                  placeholder="Satellite Feed URL"
                  className="flex-1 h-20 border-none text-xl italic font-black uppercase placeholder:opacity-10"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
                <Button
                  onClick={handleUpdateStream}
                  className="h-20 px-12 border-l-2 border-foreground"
                >
                  Link Signal
                </Button>
              </div>
            )}
            {tournament.stream_link ? (
              <div className="aspect-video bg-foreground border-8 border-foreground grayscale hover:grayscale-0 transition-all duration-700">
                <iframe
                  className="w-full h-full"
                  src={tournament.stream_link.replace("watch?v=", "embed/")}
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="aspect-video border-4 border-foreground border-dashed flex items-center justify-center">
                <p className="text-5xl font-black opacity-10 uppercase italic tracking-tighter">
                  Signal Lost
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDetailsPage;
