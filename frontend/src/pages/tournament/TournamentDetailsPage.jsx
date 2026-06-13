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
  Settings,
  Bot,
  Zap,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const [settingsData, setSettingsData] = useState({
    name: "",
    description: "",
    simulation_enabled: false,
    is_public: true,
    max_teams: 8,
    group_count: 2,
    teams_per_group: 4,
    mode: "self",
  });

  const wsMessage = useWebSocket(id);

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      setTournament(res.data);
      setSettingsData({
        name: res.data.name,
        description: res.data.description || "",
        simulation_enabled: res.data.simulation_enabled,
        is_public: res.data.is_public,
        max_teams: res.data.max_teams,
        group_count: res.data.group_count,
        teams_per_group: res.data.teams_per_group,
        mode: res.data.mode,
      });
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

  const handleSimulateMatch = async (matchId) => {
    try {
      await api.post(`/matches/${matchId}/simulate`);
      fetchTournament();
      fetchStandings();
    } catch (err) {
      alert("Simulation failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleBulkSimulate = async (stage = null, round = null) => {
    try {
      let url = `/matches/tournament/${id}/simulate`;
      const params = [];
      if (stage !== null) params.push(`stage=${stage}`);
      if (round !== null) params.push(`round=${round}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      await api.post(url);
      fetchTournament();
      fetchStandings();
    } catch (err) {
      alert("Bulk simulation failed");
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tournaments/${id}`, {
        ...settingsData,
        max_teams: parseInt(settingsData.max_teams),
        group_count: parseInt(settingsData.group_count),
        teams_per_group: parseInt(settingsData.teams_per_group),
      });
      fetchTournament();
      alert("Settings updated successfully");
    } catch (err) {
      alert("Failed to update settings");
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
      <div className="min-h-[400px] flex items-center justify-center font-medium text-muted-foreground animate-pulse">
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
    { id: "standings", label: "Matrix", icon: Trophy },
    { id: "teams", label: "Squads", icon: Users },
    { id: "news", label: "Comms", icon: Newspaper },
    { id: "info", label: "Intel", icon: ScrollText },
    { id: "live", label: "Stream", icon: Tv },
    { id: "settings", label: "Settings", icon: Settings },
  ].filter((tab) => {
    if (tab.id === "standings" && tournament?.type === "knockout") return false;
    if (tab.id === "settings" && !isOwner) return false;
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
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">
              {tournament.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
            {tournament.is_public ? (
              <span className="flex items-center gap-1.5">
                <Globe size={14} className="text-primary" /> Global Access
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-primary" /> Restricted Sector
              </span>
            )}
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="capitalize">Format: {tournament.type} {tournament.type === 'group' && `(Top ${tournament.promote_count} advance)`}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="font-mono text-xs opacity-70">ID: {String(tournament.id || "").split("-")[0]}</span>
          </div>
          {tournament.description && (
            <p className="text-sm text-muted-foreground max-w-2xl italic">
              {tournament.description}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDeleteTournament}
              variant="outline"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={18} />
            </Button>
            {tournament.type === "group" && tournament.matches?.length > 0 && (
              <Button
                onClick={promote}
                variant="outline"
                className="font-semibold"
              >
                Promote Units
              </Button>
            )}
            <Button
              onClick={generate}
              className="font-semibold"
            >
              {tournament.matches?.length > 0 ? "Regenerate Engine" : "Initialize Arena"}
            </Button>
          </div>
        )}
      </header>

      <div className="flex p-1 bg-muted rounded-xl w-fit overflow-x-auto max-w-full no-scrollbar sticky top-0 z-40 shadow-sm border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "matches" && (
          <div className="space-y-16">
            {Object.keys(groupedMatches).length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20 max-w-2xl mx-auto space-y-6">
                <Activity size={48} className="mx-auto text-muted-foreground/30" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-muted-foreground">Engine Awaiting Initialization</h3>
                  <p className="text-sm text-muted-foreground/60">Generate the match bracket to start the competition.</p>
                </div>
                {isOwner && (
                  <Button onClick={generate} className="font-semibold">
                    Start Match Engine
                  </Button>
                )}
              </div>
            ) : (
              Object.keys(groupedMatches)
                .reverse()
                .map((stage) => (
                  <div key={stage} className="space-y-10">
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex items-center gap-4 flex-1">
                        <h2 className="text-2xl font-bold tracking-tight">{stage}</h2>
                        <div className="h-px flex-1 bg-border" />
                       </div>
                       {isOwner && stage === "Group Phase" && tournament.simulation_enabled && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[10px] font-bold uppercase tracking-widest gap-2 h-8 border-primary/20 hover:bg-primary/5 hover:text-primary"
                            onClick={() => handleBulkSimulate(0)}
                          >
                            <Zap size={12} /> Fast Forward Stage
                          </Button>
                       )}
                    </div>
                    {Object.keys(groupedMatches[stage])
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((round) => (
                        <div key={round} className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-3">
                              {getRoundName(
                                parseInt(round),
                                stage,
                                Object.keys(groupedMatches[stage]).length,
                              )}
                            </h3>
                            {isOwner && tournament.simulation_enabled && groupedMatches[stage][round].some(m => !m.is_played) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[9px] font-black uppercase tracking-[0.2em] gap-1.5 opacity-40 hover:opacity-100 hover:text-primary transition-all"
                                onClick={() => handleBulkSimulate(stage === "Knockout" ? 1 : 0, round)}
                              >
                                <Bot size={10} /> Auto-play Matchday
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    "group transition-all hover:shadow-md overflow-hidden",
                                    isOwner && "cursor-pointer border-primary/20 hover:border-primary/40",
                                  )}
                                >
                                  <div className="p-5 space-y-4">
                                    <div className="space-y-3" onClick={() => {
                                      if (isOwner) {
                                        setEditingMatch(match);
                                        setEditScore1(match.team1_score);
                                        setEditScore2(match.team2_score);
                                        setScoreModalOpen(true);
                                      }
                                    }}>
                                      <div className="flex justify-between items-center">
                                        <span
                                          className={cn(
                                            "text-sm font-semibold truncate flex-1",
                                            match.winner_id === match.team1_id
                                              ? "text-foreground"
                                              : "text-muted-foreground",
                                          )}
                                        >
                                          {t1?.name || "TBD"}
                                          {match.winner_id === match.team1_id && <Badge variant="secondary" className="ml-2 py-0 h-4 text-[10px]">W</Badge>}
                                        </span>
                                        <div className="text-xl font-bold tabular-nums">
                                          {match.team1_score}
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span
                                          className={cn(
                                            "text-sm font-semibold truncate flex-1",
                                            match.winner_id === match.team2_id
                                              ? "text-foreground"
                                              : "text-muted-foreground",
                                          )}
                                        >
                                          {t2?.name || "TBD"}
                                          {match.winner_id === match.team2_id && <Badge variant="secondary" className="ml-2 py-0 h-4 text-[10px]">W</Badge>}
                                        </span>
                                        <div className="text-xl font-bold tabular-nums">
                                          {match.team2_score}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="pt-4 border-t flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider h-5">
                                          {match.status}
                                        </Badge>
                                        {isOwner && !match.is_played && tournament.simulation_enabled && (
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest gap-1 hover:text-primary"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSimulateMatch(match.id);
                                            }}
                                          >
                                            <Bot size={12} /> Simulate
                                          </Button>
                                        )}
                                      </div>
                                      {match.group_name && (
                                        <span className="text-[10px] font-medium text-muted-foreground">
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Update Match Result</DialogTitle>
                  <DialogDescription>Override the current match scores manually.</DialogDescription>
                </DialogHeader>
                {editingMatch && (
                  <form
                    onSubmit={handleUpdateScore}
                    className="space-y-8 pt-4"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-center block text-xs uppercase tracking-wider text-muted-foreground">Team 1</Label>
                        <Input
                          type="number"
                          className="h-14 text-2xl text-center font-bold"
                          value={editScore1}
                          onChange={(e) => setEditScore1(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-center block text-xs uppercase tracking-wider text-muted-foreground">Team 2</Label>
                        <Input
                          type="number"
                          className="h-14 text-2xl text-center font-bold"
                          value={editScore2}
                          onChange={(e) => setEditScore2(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full">Finalize Scores</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === "standings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.keys(groupedStandings)
              .sort()
              .map((groupName) => (
                <Card key={groupName} className="overflow-hidden border-muted/60">
                  <CardHeader className="bg-muted/50 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy size={18} className="text-primary" />
                      {groupName === "Overall" ? "Global Matrix" : `Sector ${groupName}`}
                    </CardTitle>
                  </CardHeader>
                  <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[10px] uppercase tracking-widest opacity-70">
                        <TableHead className="w-[35%]">Competitor</TableHead>
                        <TableHead className="text-center px-1">P</TableHead>
                        <TableHead className="text-center px-1">W</TableHead>
                        <TableHead className="text-center px-1">D</TableHead>
                        <TableHead className="text-center px-1">L</TableHead>
                        <TableHead className="text-center px-1">GF</TableHead>
                        <TableHead className="text-center px-1">GA</TableHead>
                        <TableHead className="text-center px-1">GD</TableHead>
                        <TableHead className="text-center px-1">Pts</TableHead>
                        <TableHead className="text-right pl-4">Next</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedStandings[groupName]
                        .sort((a, b) => b.points - a.points || b.gd - a.gd)
                        .map((s, idx) => (
                          <TableRow key={s.team_id} className={cn(
                            "text-xs transition-colors hover:bg-muted/50",
                            idx < tournament.promote_count && "bg-primary/5 border-l-2 border-l-primary"
                          )}>
                            <TableCell className="font-semibold py-4">
                              <span className={cn(
                                "text-muted-foreground mr-2 font-mono text-[10px]",
                                idx < tournament.promote_count && "text-primary opacity-100"
                              )}>{idx + 1}.</span>
                              {s.team_name}
                              {idx < tournament.promote_count && (
                                <Badge variant="outline" className="ml-2 py-0 h-4 text-[8px] border-primary/30 text-primary">Qualifying</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium opacity-60 px-1">
                              {s.played}
                            </TableCell>
                            <TableCell className="text-center px-1">{s.wins}</TableCell>
                            <TableCell className="text-center px-1">{s.draws}</TableCell>
                            <TableCell className="text-center px-1">{s.losses}</TableCell>
                            <TableCell className="text-center px-1 text-muted-foreground">{s.gf}</TableCell>
                            <TableCell className="text-center px-1 text-muted-foreground">{s.ga}</TableCell>
                            <TableCell className={cn(
                              "text-center font-bold px-1",
                              s.gd > 0 ? "text-green-600 dark:text-green-400" : s.gd < 0 ? "text-red-600 dark:text-red-400" : ""
                            )}>
                              {s.gd > 0 ? `+${s.gd}` : s.gd}
                            </TableCell>
                            <TableCell className="text-center font-black text-sm px-1">
                              {s.points}
                            </TableCell>
                            <TableCell className="text-right pl-4">
                              {s.next_opponent ? (
                                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60 flex items-center justify-end gap-1">
                                  vs {s.next_opponent}
                                  <ChevronRight size={10} className="text-primary" />
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-20">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Squad Roster</h2>
                <p className="text-sm text-muted-foreground">
                  {tournament.teams?.length} / {tournament.max_teams} units enlisted in this sector.
                </p>
              </div>

              <div className="flex gap-2">
                {isOwner && (
                  <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Plus size={16} /> Manual Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Enlist Squad</DialogTitle>
                        <DialogDescription>Manually add a competitor to this tournament.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddTeam} className="space-y-6 pt-4">
                        <div className="space-y-2">
                          <Label>Competitor Name</Label>
                          <Input
                            placeholder="e.g. Alpha Unit"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="w-full">Commit Squad</Button>
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
                      <Button size="sm" className="gap-2">
                        <UserPlus size={16} /> Register My Unit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Arena Registration</DialogTitle>
                        <DialogDescription>Select one of your squads to enlist in this arena.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleRegister} className="space-y-6 pt-4">
                        <div className="space-y-2">
                          <Label>Select Squad</Label>
                          <div className="grid gap-2 max-h-[200px] overflow-y-auto p-1">
                            {myTeams.map((t) => (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTeamId(t.id)}
                                  className={cn(
                                    "p-3 rounded-lg border-2 cursor-pointer text-sm font-semibold transition-all",
                                    selectedTeamId === t.id
                                      ? "bg-primary/5 border-primary text-primary"
                                      : "hover:bg-muted border-transparent",
                                  )}
                                >
                                  {t.name}
                                </div>
                              ))}
                          </div>
                        </div>
                        {!tournament.is_public && (
                          <div className="space-y-2">
                            <Label>Access Code</Label>
                            <Input
                              placeholder="Enter Sector Code"
                              value={joinCode}
                              onChange={(e) => setJoinCode(e.target.value)}
                              required
                            />
                          </div>
                        )}
                        <DialogFooter>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={!selectedTeamId}
                          >
                            Verify & Enlist
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tournament.teams?.map((t) => (
                <Card key={t.id} className="group hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold truncate leading-none pt-1">{t.name}</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {t.group_name ? `Sector ${t.group_name}` : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                       <Activity size={12} className="text-primary" />
                       <span>Active Protocol</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 border-t flex gap-2">
                    {!t.is_manual && (
                      <Button asChild variant="ghost" size="sm" className="flex-1 text-xs">
                        <Link to={`/team/${t.squad_id}`}>View Intel</Link>
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveTeam(t.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "news" && (
          <div className="max-w-3xl mx-auto space-y-10">
            <header className="flex items-center justify-between border-b pb-6">
              <h2 className="text-2xl font-bold tracking-tight">Comms Feed</h2>
              {isOwner && (
                <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus size={16} /> Push Broadcast
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Operational Broadcast</DialogTitle>
                      <DialogDescription>Send a message to all participants in this sector.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddNews} className="space-y-6 pt-4">
                      <Input
                        placeholder="Headline"
                        className="font-semibold"
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        required
                      />
                      <textarea
                        className="w-full min-h-[150px] p-4 rounded-lg border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Transmission Details..."
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value)}
                        required
                      />
                      <DialogFooter>
                        <Button type="submit" className="w-full">Initiate Broadcast</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </header>

            <div className="space-y-8">
              {tournament.news
                ?.sort((a, b) => b.id - a.id)
                .map((n) => (
                  <div key={n.id} className="relative pl-8 border-l-2 border-primary/20 space-y-2">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary border-4 border-background" />
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold tracking-tight">{n.title}</h3>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                           {new Date(n.created_at).toLocaleDateString()}
                         </span>
                         {isOwner && (
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6 text-muted-foreground hover:text-destructive"
                             onClick={() => handleDeleteNews(n.id)}
                           >
                             <Trash2 size={14} />
                           </Button>
                         )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {n.content}
                    </p>
                  </div>
                ))}
              {tournament.news?.length === 0 && (
                <div className="py-12 text-center text-muted-foreground/40 italic text-sm">No transmissions detected in this sector.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                   <Award size={20} className="text-primary" /> Prizes
                </h2>
                {isOwner && (
                  <Button variant="ghost" size="sm" onClick={() => setPrizeModalOpen(true)} className="h-8 text-xs font-semibold">
                    Add Prize
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {tournament.prizes_list?.map((p) => (
                  <Card key={p.id} className="p-4 group hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{p.rank}</p>
                        <p className="text-xl font-bold tracking-tight">{p.value}</p>
                      </div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          onClick={() => handleDeletePrize(p.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                {tournament.prizes_list?.length === 0 && (
                   <p className="text-sm text-muted-foreground/50 italic py-4">No prize pool specified.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                   <ScrollText size={20} className="text-primary" /> Rules
                </h2>
                {isOwner && (
                  <Button variant="ghost" size="sm" onClick={() => setRuleModalOpen(true)} className="h-8 text-xs font-semibold">
                    Add Rule
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {tournament.rules_list?.map((r, i) => (
                  <div key={r.id} className="flex gap-4 group p-4 rounded-xl bg-muted/30">
                    <span className="text-xl font-bold text-primary/20">0{i + 1}</span>
                    <p className="text-sm font-medium leading-relaxed flex-1 pt-1">{r.content}</p>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                        onClick={() => handleDeleteRule(r.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                {tournament.rules_list?.length === 0 && (
                   <p className="text-sm text-muted-foreground/50 italic py-4">No specific rules defined.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "live" && (
          <div className="max-w-4xl mx-auto space-y-8">
            {isOwner && (
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-2">
                     <Label className="text-xs uppercase tracking-wider font-semibold opacity-60">Satellite Feed URL</Label>
                     <Input
                        placeholder="YouTube/Twitch Stream Link"
                        className="shadow-none border-muted"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                     />
                  </div>
                  <Button
                    onClick={handleUpdateStream}
                    className="sm:mt-6 font-semibold"
                  >
                    Link Signal
                  </Button>
                </div>
              </Card>
            )}
            <Card className="overflow-hidden border-none shadow-2xl bg-black aspect-video relative group">
              {tournament.stream_link ? (
                <iframe
                  className="w-full h-full"
                  src={tournament.stream_link.replace("watch?v=", "embed/")}
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center animate-pulse">
                     <Tv size={32} className="text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/20 uppercase tracking-[0.3em]">Signal Lost</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-12">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Arena Configuration</h2>
              <p className="text-sm text-muted-foreground">Modify the core protocols and visibility of this tournament.</p>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Arena Name</Label>
                  <Input
                    value={settingsData.name}
                    onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                    className="font-bold tracking-tight text-lg h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Arena Intel (Description)</Label>
                  <textarea
                    className="w-full min-h-[120px] p-4 rounded-xl border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Provide details about this arena..."
                    value={settingsData.description}
                    onChange={(e) => setSettingsData({ ...settingsData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 opacity-60">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Arena Format</Label>
                    <Input
                      value={tournament.type}
                      className="font-bold tracking-tight text-sm h-12 bg-muted/30 capitalize"
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Management Mode</Label>
                    <Select
                      value={settingsData.mode}
                      onValueChange={(v) => setSettingsData({ ...settingsData, mode: v })}
                    >
                      <SelectTrigger className="h-12 font-bold tracking-tight text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self" className="text-sm font-bold">Organizer Managed</SelectItem>
                        <SelectItem value="registration" className="text-sm font-bold">Public Registration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {tournament.type === "knockout" ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Max Teams</Label>
                      <Input
                        type="number"
                        value={settingsData.max_teams}
                        onChange={(e) => setSettingsData({ ...settingsData, max_teams: e.target.value })}
                        className="font-bold tracking-tight text-sm h-12"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Number of Groups</Label>
                        <Input
                          type="number"
                          value={settingsData.group_count}
                          onChange={(e) => setSettingsData({ ...settingsData, group_count: e.target.value })}
                          className="font-bold tracking-tight text-sm h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Teams per Group</Label>
                        <Input
                          type="number"
                          value={settingsData.teams_per_group}
                          onChange={(e) => setSettingsData({ ...settingsData, teams_per_group: e.target.value })}
                          className="font-bold tracking-tight text-sm h-12"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid gap-6 pt-4">
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/30 border">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold">Public Visibility</Label>
                      <p className="text-xs text-muted-foreground">Visible to all users in the Global Matrix.</p>
                    </div>
                    <Switch
                      checked={settingsData.is_public}
                      onCheckedChange={(v) => setSettingsData({ ...settingsData, is_public: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-bold">Simulation Engine</Label>
                        <Badge variant="secondary" className="text-[8px] h-4">Beta</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Enable autonomous match simulation (random results).</p>
                    </div>
                    <Switch
                      checked={settingsData.simulation_enabled}
                      onCheckedChange={(v) => setSettingsData({ ...settingsData, simulation_enabled: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t flex flex-col gap-4">
                <Button type="submit" className="w-full h-12 font-bold uppercase tracking-widest text-xs">
                  Apply Configurations
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDeleteTournament}
                  className="w-full h-12 font-bold uppercase tracking-widest text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  Decommission Arena
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
      
      {/* Dialogs for Info section */}
      <Dialog open={prizeModalOpen} onOpenChange={setPrizeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Prize</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPrize} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Rank / Position</Label>
              <Input placeholder="e.g. 1st Place" value={prizeRank} onChange={(e) => setPrizeRank(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input placeholder="e.g. $1,000" value={prizeValue} onChange={(e) => setPrizeValue(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Save Prize</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRule} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Rule Description</Label>
              <textarea
                className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. No substitutions after 80th minute"
                value={ruleContent}
                onChange={(e) => setRuleContent(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Save Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentDetailsPage;
