import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, ShieldCheck } from "lucide-react";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";

export default function StaffChangePassword() {
  const { user, token, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword === "Welcome@123") {
      toast({ title: "Choose a different password", description: "Please set a unique password instead of the default.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch("/api/auth/staff/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to change password");
      }

      toast({ title: "Password changed", description: "Your new password is active. Please log in again." });

      // Force re-login for security
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 px-4">
      <div className="max-w-md w-full mb-8">
        <img src={bannerImg} alt="Vision 2020 Conference Banner" className="w-full h-auto rounded-lg shadow-sm border border-gray-200" />
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Change Your Password</h1>
          {user && (
            <p className="text-sm text-gray-500 mt-1 text-center">
              Welcome, <strong>{user.name}</strong>. Your account requires a new password before you can continue.
            </p>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2 text-sm text-amber-800">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>For security, your temporary password must be changed before accessing the system.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current / Temporary Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-[#F58220] hover:bg-[#e07010] text-white"
          >
            {saving ? "Changing…" : "Set New Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
