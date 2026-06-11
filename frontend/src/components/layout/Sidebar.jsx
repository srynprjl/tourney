import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Trophy,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const { darkMode, setDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "01. Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "02. Arenas", path: "/tournaments", icon: Trophy },
    { name: "03. Squads", path: "/teams", icon: Users },
  ];

  if (user) {
    navItems.push({ name: "04. Identity", path: `/player/${user.username}`, icon: Award });
  }

  if (user?.is_admin) {
    navItems.push({ name: "05. Command", path: "/admin", icon: ShieldCheck });
  }

  return (
    <aside
      className="bg-background border-r w-64 flex flex-col fixed h-full z-50"
    >
      <div className="p-8 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Trophy className="w-5 h-5" strokeWidth={2.5} />
          <span className="font-bold text-lg tracking-tighter uppercase">TourneyPro</span>
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
