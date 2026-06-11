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
    <div className="min-h-screen flex items-center justify-center bg-background p-8 font-sans">
      <div className="absolute top-0 left-0 w-full h-2 bg-foreground" />
      <Card className="w-full max-w-lg border-4 border-foreground shadow-none p-12">
        <CardHeader className="p-0 border-none space-y-8 mb-12">
          <div className="flex items-center justify-between">
            <div className="w-20 h-20 border-4 border-foreground flex items-center justify-center">
              <Shield size={40} strokeWidth={3} />
            </div>
            <Badge variant="outline" className="h-fit">AUTH_REQUIRED</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-5xl font-black uppercase italic tracking-tighter leading-none">Access Control</CardTitle>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic">Verify Operator Credentials</p>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-0 space-y-8">
            <div className="space-y-4">
              <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Key</Label>
              <Input 
                id="username" 
                placeholder="OPERATOR_ID" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className="h-16 border-2 border-foreground rounded-none px-6 font-black uppercase placeholder:opacity-20"
              />
            </div>
            <div className="space-y-4">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em]">Security Phrase</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="h-16 border-2 border-foreground rounded-none px-6 font-black"
              />
            </div>
          </CardContent>
          <CardFooter className="p-0 flex flex-col gap-8 mt-12">
            <Button className="w-full h-20 text-xl uppercase italic tracking-widest" type="submit">Initialize Link</Button>
            <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest border-t-2 border-foreground pt-8">
               <span className="opacity-40">No identity detected?</span>
               <Link to="/register" className="hover:line-through underline decoration-2 underline-offset-4">Register Unit</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
      <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.5em] opacity-20">
        TOURNEYPRO CLOUD OPERATIONALS // SECURE PROTOCOL
      </div>
    </div>
  );
};

export default LoginPage;
