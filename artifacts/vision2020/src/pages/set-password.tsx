import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useSetPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";
import { useAuth } from "@/hooks/use-auth";

export default function SetPassword() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login: setAuthContext } = useAuth();
  
  const setPasswordMutation = useSetPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }
    
    setPasswordMutation.mutate({
      data: { mobile, password }
    }, {
      onSuccess: (data) => {
        setAuthContext(data.token, data.user);
        toast({ title: "Password set successfully" });
        setLocation("/participant/dashboard");
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to set password", 
          description: err.message || "Please check your details",
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Set Your Password</h1>
        <p className="text-gray-600 mb-6 text-center text-sm">For first-time participants</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Registered Mobile Number</Label>
            <Input 
              id="mobile" 
              placeholder="Enter your mobile number" 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Enter new password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              placeholder="Confirm new password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
            disabled={setPasswordMutation.isPending}
          >
            {setPasswordMutation.isPending ? "Setting password..." : "Set Password & Login"}
          </Button>
          
          <div className="text-center mt-4 pt-4 border-t border-gray-100">
            <Link href="/login" className="text-sm text-primary font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
