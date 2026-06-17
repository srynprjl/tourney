import React, { useState, useEffect } from "react";
import api from "@/services/api";
import {
  Users,
  Shield,
  Ban,
  Activity,
  AlertCircle,
  RefreshCw,
  Trash2,
  UserPlus,
  Settings2,
  Trophy,
  HeartPulse,
  SignalHigh,
  SignalLow,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLogService, setSelectedLogService] = useState("auth");
  const [logContent, setLogContent] = useState("");
  const [mqStats, setMQStats] = useState({});
  const [services, setServices] = useState([
    {
      id: "auth",
      name: "Auth Identity Core",
      url: "/auth/health",
      logs: "/auth/admin/logs",
      mq: "/auth/admin/mq-stats",
      status: "unknown",
    },
    {
      id: "tournament",
      name: "Tournament Engine",
      url: "/tournaments/health",
      logs: "/tournaments/admin/logs",
      mq: "/tournaments/admin/mq-stats",
      status: "unknown",
    },
    {
      id: "match",
      name: "Match Logic Processor",
      url: "/matches/health",
      logs: "/matches/admin/logs",
      mq: "/matches/admin/mq-stats",
      status: "unknown",
    },
    {
      id: "team",
      name: "Squad Roster Cloud",
      url: "/team/health",
      logs: "/team/admin/logs",
      mq: "/team/admin/mq-stats",
      status: "unknown",
    },
    {
      id: "profile",
      name: "Player Profile Hub",
      url: "/profile/health",
      logs: "/profile/admin/logs",
      mq: "/profile/admin/mq-stats",
      status: "unknown",
    },
    {
      id: "realtime",
      name: "WebSocket Realtime",
      url: "/realtime/health",
      logs: "/realtime/admin/logs",
      mq: "/realtime/admin/mq-stats",
      status: "unknown",
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    checkHealth();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs(selectedLogService);
    }
    if (activeTab === "infrastructure" || activeTab === "mq") {
      fetchMQStats();
    }
  }, [activeTab, selectedLogService]);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, tourneyRes, reportsRes, teamsRes] = await Promise.all([
        api.get("/auth/admin/users"),
        api.get("/auth/admin/stats"),
        api.get("/tournaments"),
        api.get("/profile/admin/reports"),
        api.get("/team/admin/teams"),
      ]);
      setUsers(usersRes.data || []);
      setStats(statsRes.data);
      setTournaments(tourneyRes.data || []);
      setReports(reportsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    const updatedServices = await Promise.all(
      services.map(async (s) => {
        try {
          await api.get(s.url);
          return { ...s, status: "healthy" };
        } catch (err) {
          return { ...s, status: "unhealthy" };
        }
      }),
    );
    setServices(updatedServices);
  };

  const fetchLogs = async (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    try {
      const res = await api.get(service.logs);
      setLogContent(res.data);
    } catch (err) {
      setLogContent("Failed to fetch logs: " + err.message);
    }
  };

  const fetchMQStats = async () => {
    const stats = {};
    await Promise.all(
      services.map(async (s) => {
        if (!s.mq) return;
        try {
          const res = await api.get(s.mq);
          stats[s.id] = res.data;
        } catch (err) {
          stats[s.id] = { error: true };
        }
      }),
    );
    setMQStats(stats);
  };

  const triggerTestTask = async (serviceId) => {
    try {
      const endpointMap = {
        auth: "/auth/admin/trigger-task",
        tournament: "/tournaments/admin/trigger-task",
        match: "/matches/admin/trigger-task",
        team: "/team/admin/trigger-task",
        profile: "/profile/admin/trigger-task",
        realtime: "/realtime/admin/trigger-task",
      };

      const endpoint = endpointMap[serviceId];
      await api.post(endpoint, {
        type: "ADMIN_MANUAL_TEST",
        payload: `Task triggered by admin for service: ${serviceId}`,
      });
      alert(`Test task injected into ${serviceId} SQS queue`);
      fetchMQStats();
    } catch (err) {
      alert("Failed to trigger test task");
    }
  };

  const toggleAdmin = async (id) => {
    try {
      await api.put(`/auth/admin/users/${id}/toggle-admin`);
      fetchData();
    } catch (err) {
      alert("Failed to update admin status");
    }
  };

  const toggleBan = async (id) => {
    try {
      await api.put(`/auth/admin/users/${id}/toggle-ban`);
      fetchData();
    } catch (err) {
      alert("Failed to update ban status");
    }
  };

  const deleteTournament = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this tournament? This action cannot be undone.",
      )
    )
      return;
    try {
      await api.delete(`/tournaments/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete tournament");
    }
  };

  const adminDeleteTeam = async (id) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    try {
      await api.delete(`/team/admin/teams/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete team");
    }
  };

  const resolveReport = async (id) => {
    try {
      await api.delete(`/profile/admin/reports/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to resolve report");
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.is_admin = formData.get("is_admin") === "on";

    try {
      if (currentUser) {
        await api.put(`/auth/admin/users/${currentUser.id}`, data);
      } else {
        await api.post("/auth/admin/users", data);
      }
      setIsUserModalOpen(false);
      setCurrentUser(null);
      fetchData();
    } catch (err) {
      alert("Operation failed");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/auth/admin/users/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  if (loading)
    return (
      <div className="min-h-[400px] flex items-center justify-center font-bold tracking-tighter text-2xl animate-pulse uppercase">
        Loading Admin Panel...
      </div>
    );

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "tournaments", label: "Arenas", icon: Trophy },
    { id: "teams", label: "Squads", icon: Shield },
    { id: "infrastructure", label: "Infra", icon: HeartPulse },
    { id: "mq", label: "Queues", icon: RefreshCw },
    { id: "logs", label: "Logs", icon: Activity },
    { id: "reports", label: "Reports", icon: AlertCircle },
  ];

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
              System Administration
            </span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">
            Admin
          </h1>
        </div>
        <Button
          variant="outline"
          className="px-8 font-black uppercase tracking-widest text-[10px] h-12"
          onClick={() => {
            fetchData();
            checkHealth();
          }}
        >
          <RefreshCw size={14} className="mr-2" /> Refresh System
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
              activeTab === tab.id
                ? "border-b-2 border-primary"
                : "opacity-30 hover:opacity-100",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-12">
        {activeTab === "users" && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l">
              <div className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">
                  01. Total Users
                </p>
                <p className="text-6xl font-bold tracking-tighter uppercase leading-none">
                  {stats?.total_users || 0}
                </p>
              </div>
              <div className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">
                  02. Admins
                </p>
                <p className="text-6xl font-bold tracking-tighter uppercase leading-none">
                  {stats?.admin_count || 0}
                </p>
              </div>
              <div className="p-10 border-r border-b hover:bg-accent/30 transition-colors group">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-8">
                  03. Banned
                </p>
                <p className="text-6xl font-bold tracking-tighter uppercase leading-none">
                  {users.filter((u) => u.is_banned).length}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end border-b pb-8">
              <h2 className="text-4xl font-bold tracking-tighter uppercase italic">
                Identity Management
              </h2>
              <Button
                className="h-12 px-8 font-black uppercase text-[10px] tracking-widest"
                onClick={() => {
                  setCurrentUser(null);
                  setIsUserModalOpen(true);
                }}
              >
                <UserPlus size={14} className="mr-2" /> Add Operative
              </Button>
            </div>

            <div className="border-t border-l">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background border-none h-16">
                    <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Username
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Clearance
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Status
                    </TableHead>
                    <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className={cn(
                        "h-20 border-none hover:bg-accent/30 transition-colors group",
                        u.is_banned && "bg-destructive/5 opacity-80",
                      )}
                    >
                      <TableCell className="pl-8 border-r border-b">
                        <div className="flex flex-col">
                          <Link
                            to={`/player/${u.username}`}
                            className="font-bold text-lg tracking-tighter uppercase hover:text-primary transition-colors"
                          >
                            {u.username}
                          </Link>
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">
                            ID: {u.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-b">
                        <span
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest border px-3 py-1",
                            u.is_admin
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted text-muted-foreground",
                          )}
                        >
                          {u.is_admin ? "ADMIN" : "USER"}
                        </span>
                      </TableCell>
                      <TableCell className="border-r border-b">
                        <span
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest border px-3 py-1",
                            u.is_banned
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-muted text-muted-foreground",
                          )}
                        >
                          {u.is_banned ? "BANNED" : "ACTIVE"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-8 border-r border-b space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 border rounded-none p-0"
                          onClick={() => {
                            setCurrentUser(u);
                            setIsUserModalOpen(true);
                          }}
                        >
                          <Settings2 size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 border rounded-none p-0"
                          title="Toggle Admin"
                          onClick={() => toggleAdmin(u.id)}
                        >
                          <Shield
                            size={14}
                            className={
                              u.is_admin
                                ? "text-primary"
                                : "text-muted-foreground/30"
                            }
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 border rounded-none p-0"
                          title={u.is_banned ? "Restore" : "Ban"}
                          onClick={() => toggleBan(u.id)}
                        >
                          <Ban
                            size={14}
                            className={
                              u.is_banned
                                ? "text-red-600"
                                : "text-muted-foreground/30"
                            }
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 border rounded-none p-0 hover:bg-red-600 hover:text-white"
                          onClick={() => deleteUser(u.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "tournaments" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
            {tournaments.map((t, i) => (
              <div
                key={t.id}
                className="p-10 border-r border-b hover:bg-accent/30 transition-colors group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-12">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">
                    Arena {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex gap-4 opacity-40">
                    {t.is_public ? <Globe size={14} /> : <Lock size={14} />}
                  </div>
                </div>
                <div className="space-y-4 mb-16 flex-1">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">
                    {t.type} Arena // {t.creator_id}
                  </span>
                  <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none italic">
                    {t.name}
                  </h3>
                </div>
                <div className="flex gap-4">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 font-black uppercase tracking-widest text-[10px] h-12"
                  >
                    <Link to={`/tournament/${t.id}`}>Enter Arena</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-12 h-12 p-0 text-muted-foreground hover:text-red-600 border"
                    onClick={() => deleteTournament(t.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
            {teams.map((t, i) => (
              <div
                key={t.id}
                className="p-10 border-r border-b hover:bg-accent/30 transition-colors group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-12">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">
                    Squad {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex gap-4 opacity-40">
                    {t.is_public ? <Globe size={14} /> : <Lock size={14} />}
                  </div>
                </div>
                <div className="space-y-4 mb-16 flex-1">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">
                    {t.sport} // Owner ID: {t.owner_id}
                  </span>
                  <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none italic">
                    {t.name}
                  </h3>
                </div>
                <div className="flex gap-4">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 font-black uppercase tracking-widest text-[10px] h-12"
                  >
                    <Link to={`/team/${t.id}`}>View Squad</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-12 h-12 p-0 text-muted-foreground hover:text-red-600 border"
                    onClick={() => adminDeleteTeam(t.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-[0.4em] opacity-20 border-r border-b">
                No active squads found in system
              </div>
            )}
          </div>
        )}

        {activeTab === "infrastructure" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
            {services.map((s, i) => (
              <div
                key={s.id}
                className="p-10 border-r border-b hover:bg-accent/30 transition-colors group relative overflow-hidden"
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 w-full h-[2px] transition-all duration-500",
                    s.status === "healthy"
                      ? "bg-primary"
                      : "bg-red-600 animate-pulse",
                  )}
                />
                <div className="space-y-12">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">
                      Service {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.status === "healthy" ? (
                      <SignalHigh size={14} className="opacity-40" />
                    ) : (
                      <SignalLow
                        size={14}
                        className="text-red-600 animate-pulse"
                      />
                    )}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold uppercase tracking-tighter leading-none">
                      {s.name}
                    </h3>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
                      {s.url}
                    </p>

                    {mqStats[s.id] && !mqStats[s.id].error && (
                      <div className="mt-4 pt-4 border-t border-dashed">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                            Queue: {mqStats[s.id].queue_name}
                          </span>
                          <span className="text-xs font-bold font-mono tracking-tighter">
                            {mqStats[s.id].queue_length} TASKS
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 border",
                        s.status === "healthy"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-red-600 text-red-600",
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2 border-b pb-8">
              {services.map((s) => (
                <button
                  key={s.id}
                  className={cn(
                    "px-6 py-3 text-[8px] font-black uppercase tracking-widest border transition-all",
                    selectedLogService === s.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "opacity-40 hover:opacity-100 border-muted",
                  )}
                  onClick={() => setSelectedLogService(s.id)}
                >
                  {s.name}
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-10 px-4 font-black uppercase text-[8px] tracking-widest"
                onClick={() => fetchLogs(selectedLogService)}
              >
                <RefreshCw size={12} className="mr-2" /> Refresh
              </Button>
            </div>

            <div className="bg-black p-8 border rounded-sm overflow-x-auto min-h-[500px] max-h-[800px] flex flex-col">
              <div className="flex-1 font-mono text-xs text-green-500 whitespace-pre scrollbar-thin scrollbar-thumb-primary">
                {logContent || "Initializing terminal..."}
              </div>
            </div>
          </div>
        )}

        {activeTab === "mq" && (
          <div className="space-y-12">
            <div className="flex justify-between items-end border-b pb-8">
              <h2 className="text-4xl font-bold tracking-tighter uppercase italic">
                Instruction Stream
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 font-black uppercase text-[8px] tracking-widest"
                onClick={fetchMQStats}
              >
                <RefreshCw size={12} className="mr-2" /> Sync Queues
              </Button>
            </div>

            {services.map((s) => (
              <div key={s.id} className="border-t pt-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold uppercase tracking-tighter leading-none">
                      {s.name}
                    </h3>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mt-2">
                      SQS URL: {mqStats[s.id]?.queue_url || "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 font-black uppercase text-[8px] tracking-widest hover:bg-primary hover:text-primary-foreground"
                      onClick={() => triggerTestTask(s.id)}
                    >
                      Trigger AWS Task
                    </Button>
                    <div className="text-right flex gap-8">
                      <div>
                        <p className="text-4xl font-bold tracking-tighter leading-none">
                          {mqStats[s.id]?.queue_length || 0}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                          Available
                        </p>
                      </div>
                      <div>
                        <p className="text-4xl font-bold tracking-tighter leading-none text-primary">
                          {mqStats[s.id]?.in_flight || 0}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                          In Flight
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-muted bg-accent/5 p-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="text-[8px] font-black uppercase tracking-widest w-16">
                          Index
                        </TableHead>
                        <TableHead className="text-[8px] font-black uppercase tracking-widest">
                          Pending Task Payload
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mqStats[s.id]?.tasks &&
                      mqStats[s.id].tasks.length > 0 ? (
                        mqStats[s.id].tasks.map((task, idx) => (
                          <TableRow key={idx} className="border-muted/20">
                            <TableCell className="text-[10px] font-mono opacity-40 italic">
                              #{idx + 1}
                            </TableCell>
                            <TableCell className="text-[10px] font-mono whitespace-pre-wrap break-all">
                              {task}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="border-none hover:bg-transparent">
                          <TableCell
                            colSpan={2}
                            className="py-12 text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-20 italic"
                          >
                            Queue is empty. Awaiting instructions.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {mqStats[s.id]?.completed &&
                  mqStats[s.id].completed.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">
                        Recently Processed
                      </p>
                      <div className="border border-primary/20 bg-primary/5 p-4 overflow-x-auto">
                        <Table>
                          <TableBody>
                            {mqStats[s.id].completed.map((task, idx) => (
                              <TableRow key={idx} className="border-primary/10">
                                <TableCell className="text-[10px] font-mono opacity-60">
                                  {task}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-primary">
                                    COMPLETED
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-8">
            <div className="border-t border-l">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background h-16">
                    <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Target
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Type
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Reason
                    </TableHead>
                    <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest border-r border-b">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length > 0 ? (
                    reports.map((r) => (
                      <TableRow
                        key={r.id}
                        className="h-20 hover:bg-accent/30 transition-colors"
                      >
                        <TableCell className="pl-8 border-r border-b font-bold font-mono text-xs uppercase tracking-tighter">
                          {r.target_id}
                        </TableCell>
                        <TableCell className="border-r border-b">
                          <Badge
                            variant="outline"
                            className="rounded-none font-black text-[8px] tracking-[0.2em]"
                          >
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="border-r border-b text-xs opacity-60 italic">
                          {r.reason}
                        </TableCell>
                        <TableCell className="text-right pr-8 border-r border-b">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-6 font-black uppercase text-[8px] tracking-widest"
                            onClick={() => resolveReport(r.id)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-20 text-center text-[10px] font-black uppercase tracking-[0.4em] opacity-20"
                      >
                        Secure: No pending violations
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* User CRUD Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-background border rounded-none shadow-2xl">
            <CardHeader className="border-b">
              <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">
                {currentUser ? "Edit operative" : "Induct New Operative"}
              </CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Identity modification protocol
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUserSubmit}>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                    Codename
                  </label>
                  <input
                    name="username"
                    defaultValue={currentUser?.username}
                    className="w-full bg-transparent border p-4 font-bold uppercase tracking-tighter focus:border-primary outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                    Security Key
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder={
                      currentUser ? "(Leave blank to keep current)" : "********"
                    }
                    className="w-full bg-transparent border p-4 font-bold uppercase tracking-tighter focus:border-primary outline-none"
                    required={!currentUser}
                  />
                </div>
                <div className="flex items-center gap-4 border p-4">
                  <input
                    name="is_admin"
                    type="checkbox"
                    defaultChecked={currentUser?.is_admin}
                    className="w-4 h-4 accent-primary"
                  />
                  <label className="text-[10px] font-black uppercase tracking-widest">
                    Administrator Clearance
                  </label>
                </div>
              </CardContent>
              <div className="flex border-t">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 h-16 rounded-none font-black uppercase tracking-widest text-[10px]"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Abort
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-16 rounded-none font-black uppercase tracking-widest text-[10px]"
                >
                  Execute
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
