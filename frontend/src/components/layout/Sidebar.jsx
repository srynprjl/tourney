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
      className="bg-background border-r-2 border-foreground w-64 flex flex-col fixed h-full z-50 font-sans"
    >
      <div className="p-8 flex items-center justify-between border-b-2 border-foreground">
        <Link to="/dashboard" className="flex items-center gap-3">
          <Trophy className="w-6 h-6" strokeWidth={3} />
          <span className="font-black text-xl uppercase tracking-tighter italic">TourneyPro</span>
        </Link>
      </div>

      <nav className="flex-1 p-6 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center p-4 transition-all text-[10px] font-black uppercase tracking-widest",
              location.pathname === item.path
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-muted",
            )}
          >
            <item.icon size={16} className="mr-4" strokeWidth={2.5} />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t-2 border-foreground space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-4 text-[10px] font-black uppercase tracking-widest h-12"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-4 text-[10px] font-black uppercase tracking-widest h-12 text-foreground hover:bg-foreground hover:text-background"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Exit System</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
