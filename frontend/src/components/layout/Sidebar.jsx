import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Trophy,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Award,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";

const Sidebar = () => {
  const { darkMode, setDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [feed, setFeed] = useState([]);

  const lastMessage = useWebSocket("global");

  useEffect(() => {
    if (lastMessage?.type === "GLOBAL_FEED") {
      setFeed((prev) => [lastMessage.data, ...prev].slice(0, 5));
    }
  }, [lastMessage]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Arenas", path: "/tournaments", icon: Trophy },
    { name: "Squads", path: "/teams", icon: Users },
  ];

  if (user) {
    navItems.push({
      name: "Profile",
      path: `/player/${user.username}`,
      icon: Award,
    });
  }

  if (user?.is_admin) {
    navItems.push({ name: "Admin", path: "/admin", icon: ShieldCheck });
  }

  return (
    <aside className="bg-background border-r w-64 flex flex-col fixed h-full z-50">
      <div className="p-8 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Trophy className="w-5 h-5" strokeWidth={2.5} />
          <span className="font-bold text-lg tracking-tighter uppercase">
            TourneyPro
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center px-4 py-2.5 transition-all text-xs font-semibold uppercase tracking-widest",
              location.pathname === item.path
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{item.name}</span>
          </Link>
        ))}

        <div className="mt-12 space-y-4 px-4">
          <div className="flex items-center gap-2 opacity-30">
            <Activity size={10} />
            <span className="text-[8px] font-black uppercase tracking-[0.3em]">
              System Live Feed
            </span>
          </div>
          <div className="space-y-3">
            {feed.map((msg, i) => (
              <div
                key={i}
                className="text-[9px] font-bold uppercase tracking-wider leading-relaxed border-l border-primary/20 pl-3 py-1 opacity-70 animate-in fade-in slide-in-from-left-2 duration-500"
              >
                {msg}
              </div>
            ))}
            {feed.length === 0 && (
              <p className="text-[8px] italic opacity-20 uppercase tracking-widest">
                Awaiting transmission...
              </p>
            )}
          </div>
        </div>
      </nav>

      <div className="p-4 space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 font-semibold text-xs uppercase tracking-widest h-10 px-4"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{darkMode ? "Light" : "Dark"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 font-semibold text-xs uppercase tracking-widest h-10 px-4 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut size={14} />
          <span>Exit</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
