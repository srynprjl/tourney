import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { ShieldCheck, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const ApplicationPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    reason: ''
  });
  const [submitted, setSubmitted] = useState(localStorage.getItem('applied') === 'true');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/apply', formData);
      setSubmitted(true);
      localStorage.setItem('applied', 'true');
    } catch (err) {
      alert('Application failed: ' + (err.response?.data?.error || err.message));
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md shadow-2xl text-center p-8 space-y-6">
          <div className="mx-auto bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center">
            <ShieldCheck className="text-green-600 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black">Application Received</CardTitle>
            <p className="text-muted-foreground font-medium">
              Your enlistment request has been transmitted. An administrator will review your credentials shortly.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Return to Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg shadow-2xl rounded-[2.5rem] border-none overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-10 text-center space-y-2">
          <CardTitle className="text-4xl font-black uppercase italic tracking-tighter">Enlistment Portal</CardTitle>
          <CardDescription className="text-primary-foreground/70 font-bold uppercase text-[10px] tracking-[0.2em]">Submit your credentials for arena access</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-10 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Desired Username</Label>
                <Input 
                  placeholder="E.g. GhostWalker" 
                  value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value})} 
                  required 
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Secure Password</Label>
                <Input 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  required 
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Communication Channel (Email)</Label>
              <Input 
                type="email" 
                placeholder="operator@nexus.com" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required 
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Reason for Enlistment</Label>
              <textarea 
                className="w-full min-h-[120px] p-4 bg-muted/20 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium"
                placeholder="Why do you want to join the tourney?" 
                value={formData.reason} 
                onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="p-10 pt-0 flex flex-col gap-6">
            <Button className="w-full h-14 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/20" type="submit">
              <Send size={18}/> TRANSMIT APPLICATION
            </Button>
            <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Already have credentials? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ApplicationPage;
