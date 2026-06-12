import { useState } from "react";
import { Link } from "wouter";
import { useForgotPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";

export default function ForgotPassword() {
  const [mobile, setMobile] = useState("");
  const [success, setSuccess] = useState(false);
  
  const { toast } = useToast();
  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    forgotPasswordMutation.mutate({
      data: { mobile }
    }, {
      onSuccess: () => {
        setSuccess(true);
        toast({ title: "Reset link sent" });
      },
      onError: (err: any) => {
        toast({ 
          title: "Request failed", 
          description: err.message || "Please check your mobile number",
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Forgot Password</h1>
        
        {success ? (
          <div className="text-center">
            <p className="text-gray-600 mb-6 text-sm">
              If an account exists for {mobile}, you will receive a password reset link shortly.
              (For demo purposes, you might want to use the /reset-password route directly if you got the token).
            </p>
            <Link href="/login" className="text-sm text-primary font-medium hover:underline mt-4 block">
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Enter your registered mobile number to receive a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input 
                  id="mobile" 
                  placeholder="Enter your mobile number" 
                  value={mobile} 
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Request Reset Link"}
              </Button>
              
              <div className="text-center mt-4 pt-4 border-t border-gray-100">
                <Link href="/login" className="text-sm text-primary font-medium hover:underline">
                  Back to Login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
