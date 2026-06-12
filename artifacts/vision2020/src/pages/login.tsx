import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login: setAuthContext } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast({
          title: "Login failed",
          description: data.message ?? data.error ?? "Please check your credentials and try again",
          variant: "destructive",
        });
        return;
      }
      const mustChange = data.mustChangePassword ?? false;
      setAuthContext(data.token, data.user, mustChange);
      if (!mustChange) {
        toast({ title: "Welcome back!", description: data.user.name });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4">
      <div className="max-w-md w-full mb-8">
        <img
          src={bannerImg}
          alt="Vision 2020 Conference Banner"
          className="w-full h-auto rounded-lg shadow-sm border border-gray-200"
        />
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In to Your Account</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number / EMP ID</Label>
            <Input
              id="mobile"
              placeholder="Enter your mobile number or EMP ID"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-[#F58220] hover:underline">
                Forgot Password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#F58220] hover:bg-[#e07010] text-white"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>

          <div className="text-center mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">First time logging in?</p>
            <Link href="/set-password" className="text-sm text-[#F58220] font-medium hover:underline mt-1 block">
              Set up your password
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
