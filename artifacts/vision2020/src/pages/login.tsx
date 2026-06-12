import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoginInputUserType } from "@workspace/api-client-react/src/generated/api.schemas";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<LoginInputUserType>("participant");
  
  const { login: setAuthContext } = useAuth();
  const [, setLocation] = useLocation();
  void setLocation; // suppress unused-var if navigation moved to login fn
  const { toast } = useToast();
  
  const loginMutation = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      data: { mobile, password, userType }
    }, {
      onSuccess: (data) => {
        const mustChange = (data as unknown as { mustChangePassword?: boolean }).mustChangePassword ?? false;
        setAuthContext(data.token, data.user, mustChange);
        if (!mustChange) {
          toast({ title: "Login successful" });
        }
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Please check your credentials and try again";
        toast({ 
          title: "Login failed", 
          description: msg,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4">
      <div className="max-w-md w-full mb-8">
        <img src={bannerImg} alt="Vision 2020 Conference Banner" className="w-full h-auto rounded-lg shadow-sm border border-gray-200" />
      </div>
      
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In to Your Account</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userType">Login As</Label>
            <Select value={userType} onValueChange={(v: LoginInputUserType) => setUserType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participant">Participant</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="track_coordinator">Track Coordinator</SelectItem>
                <SelectItem value="food_coordinator">Food Coordinator</SelectItem>
                <SelectItem value="scientific_committee">Scientific Committee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number / User ID</Label>
            <Input 
              id="mobile" 
              placeholder="Enter your mobile number" 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              {userType === "participant" && (
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot Password?
                </Link>
              )}
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
          
          {userType === "participant" && (
            <div className="text-center mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">First time logging in?</p>
              <Link href="/set-password" className="text-sm text-primary font-medium hover:underline mt-1 block">
                Set up your password
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
