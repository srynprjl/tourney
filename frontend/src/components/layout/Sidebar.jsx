import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Trophy,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const { darkMode, setDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Teams", path: "/teams", icon: Users },
  ];

  if (user) {
    navItems.push({ name: "My Profile", path: `/player/${user.username}`, icon: Trophy });
  }

  if (user?.is_admin) {
    navItems.push({ name: "Admin Panel", path: "/admin", icon: ShieldCheck });
  }

  return (
    <aside
      className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col fixed h-full z-50",
        isSidebarOpen ? "w-64" : "w-20",
      )}
    >
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="text-primary w-6 h-6" />
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight">TourneyPro</span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center p-3 rounded-lg transition-all",
              location.pathname === item.path
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon size={20} />
            {isSidebarOpen && (
              <span className="ml-3 font-medium">{item.name}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          {isSidebarOpen && (
            <span>{darkMode ? "Light Theme" : "Dark Theme"}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          {isSidebarOpen && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
