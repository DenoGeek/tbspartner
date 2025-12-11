"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

interface Particle {
  id: number;
  size: number;
  left: number;
  top: number;
  floatX: number;
  floatY: number;
  duration: number;
  delay: number;
}

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Generate particles only on client side to avoid hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        floatX: Math.random() * 100 - 50,
        floatY: Math.random() * 100 - 50,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient.login({ username, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Theme Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-4 right-4 z-50 h-10 w-10 backdrop-blur-sm bg-card/80 border border-border/50"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Animated Gradient Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(-45deg, hsl(var(--primary)), hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.3), hsl(var(--primary)))`,
            backgroundSize: '400% 400%',
            animation: 'gradientShift 15s ease infinite'
          }}
        />
        
        {/* Gradient Orbs */}
        <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary))] opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary))] opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--primary))] opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
        
        {/* Floating Particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-[hsl(var(--primary))] opacity-20 blur-sm"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              '--float-x': `${particle.floatX}px`,
              '--float-y': `${particle.floatY}px`,
              animation: `float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Login Card */}
      <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/80 border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}





