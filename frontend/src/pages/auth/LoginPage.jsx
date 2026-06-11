import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token);
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-12">
        <header className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Secure Login</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter uppercase leading-none">Login</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enter your credentials to continue.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Username</Label>
              <Input 
                id="username" 
                placeholder="USERNAME" 
                className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase font-bold tracking-widest text-xs"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors text-xs"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>
          
          <div className="space-y-8 pt-4">
            <Button className="w-full font-black uppercase tracking-[0.3em] text-[10px] h-14" type="submit">Sign In</Button>
            
            <div className="flex flex-col gap-4 text-center">
              <Link to="/register" className="text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-50 transition-opacity">Create Account</Link>
              <Link to="/" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">← Back home</Link>
            </div>
          </div>
        </form>
      </div>
      
      <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.5em] opacity-20">
        TourneyPro // Authentication
      </div>
    </div>
  );
};

export default LoginPage;
