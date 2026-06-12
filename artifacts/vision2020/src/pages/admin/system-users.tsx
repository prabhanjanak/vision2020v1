import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSystemUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, KeyRound, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  track_coordinator: "Track Coordinator",
  food_coordinator: "Food Coordinator",
  scientific_committee: "Scientific Committee",
};

const TRACKS = ["Track 1", "Track 2", "Track 3", "Track 4", "Track 5 Day 1", "Track 5 Day 2"];

type SystemUser = {
  id: number;
  empId: string;
  name: string;
  email: string | null;
  mobile: string | null;
  userType: string;
  assignedTrack: string | null;
  mustChangePassword: boolean;
  createdAt: string;
};

type FormData = {
  empId: string;
  name: string;
  email: string;
  userType: string;
  assignedTrack: string;
  password: string;
};

const EMPTY_FORM: FormData = {
  empId: "",
  name: "",
  email: "",
  userType: "track_coordinator",
  assignedTrack: "",
  password: "Welcome@123",
};

export default function SystemUsers() {
  const { token } = useAuth();
  const { data: users, isLoading } = useListSystemUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);

  function openCreate() {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(u: SystemUser) {
    setEditUser(u);
    setForm({
      empId: u.empId,
      name: u.name,
      email: u.email ?? "",
      userType: u.userType,
      assignedTrack: u.assignedTrack ?? "",
      password: "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.empId.trim() || !form.name.trim() || !form.userType) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const body: Record<string, unknown> = {
        empId: form.empId.trim(),
        name: form.name.trim(),
        email: form.email.trim() || null,
        userType: form.userType,
        assignedTrack: form.assignedTrack || null,
      };
      if (!editUser || form.password) body.password = form.password || "Welcome@123";

      let resp: Response;
      if (editUser) {
        resp = await fetch(`/api/system-users/${editUser.id}`, {
          method: "PATCH", headers, body: JSON.stringify(body),
        });
      } else {
        resp = await fetch(`/api/system-users`, {
          method: "POST", headers, body: JSON.stringify(body),
        });
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Save failed");
      }

      toast({
        title: editUser ? "User updated" : "User created",
        description: editUser
          ? `${form.name} has been updated.`
          : `${form.name} created. Default password: ${form.password || "Welcome@123"}. They must change it on first login.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-users"] });
      setModalOpen(false);
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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const resp = await fetch(`/api/system-users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Delete failed");
      toast({ title: "User deleted", description: `${deleteTarget.name} has been removed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/system-users"] });
    } catch {
      toast({ title: "Error deleting user", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleReset() {
    if (!resetTarget) return;
    try {
      const resp = await fetch(`/api/system-users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Reset failed");
      toast({
        title: "Password reset",
        description: `${resetTarget.name}'s password reset to Welcome@123. They must change it on next login.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-users"] });
    } catch {
      toast({ title: "Error resetting password", variant: "destructive" });
    } finally {
      setResetTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff &amp; Coordinators</h1>
          <p className="text-gray-500 mt-1">Manage admins, track coordinators, food staff, and committee members</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#F58220] hover:bg-[#e07010] text-white">
          <Plus className="w-4 h-4" /> Add Staff User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EMP ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : users && users.length > 0 ? (
                  (users as unknown as SystemUser[]).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono font-medium text-[#6F42C1]">{user.empId}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{user.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-[#6F42C1] border-purple-200">
                          {ROLE_LABELS[user.userType] ?? user.userType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{user.assignedTrack || "—"}</TableCell>
                      <TableCell>
                        {user.mustChangePassword ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-xs">
                            <ShieldAlert className="w-3 h-3" /> Must Reset
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-0.5">
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(user)}>
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset Password" onClick={() => setResetTarget(user)}>
                          <KeyRound className="w-4 h-4 text-amber-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteTarget(user)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                      No staff users found. Click "Add Staff User" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit Staff User" : "Add Staff User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="empId">
                  EMP ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="empId"
                  placeholder="e.g. SEH-001"
                  value={form.empId}
                  onChange={(e) => setForm((f) => ({ ...f, empId: e.target.value }))}
                />
                <p className="text-xs text-gray-400">Used to log in</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uname">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="uname"
                  placeholder="Dr. Rajan Kumar"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Org Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="rajan@sankara.in"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.userType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      userType: v,
                      assignedTrack: v === "track_coordinator" ? f.assignedTrack : "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="track_coordinator">Track Coordinator</SelectItem>
                    <SelectItem value="food_coordinator">Food Coordinator</SelectItem>
                    <SelectItem value="scientific_committee">Scientific Committee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.userType === "track_coordinator" && (
                <div className="space-y-1.5">
                  <Label>Assigned Track</Label>
                  <Select
                    value={form.assignedTrack}
                    onValueChange={(v) => setForm((f) => ({ ...f, assignedTrack: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRACKS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                {editUser ? "New Password" : "Password"}
              </Label>
              <Input
                id="password"
                type="text"
                placeholder={editUser ? "Leave blank to keep current" : "Welcome@123"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="text-xs text-gray-400">
                {editUser
                  ? "Leave blank to keep current password. Setting a new password forces reset on next login."
                  : <>Default: <code className="bg-gray-100 px-1 rounded">Welcome@123</code> — staff must change it on first login.</>}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#F58220] hover:bg-[#e07010] text-white"
            >
              {saving ? "Saving…" : editUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.empId}).
              They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirm */}
      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset <strong>{resetTarget?.name}</strong>'s password to{" "}
              <code className="bg-gray-100 px-1 rounded">Welcome@123</code>. They must change it on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
