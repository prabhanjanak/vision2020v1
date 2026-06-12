import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListParticipants, getListParticipantsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Eye, FileSpreadsheet, CheckCircle, Pencil } from "lucide-react";
import { Link } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

type EditForm = { name: string; mobile: string; email: string; institution: string };

export default function AdminParticipants() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", mobile: "", email: "", institution: "" });
  const [editSaving, setEditSaving] = useState(false);

  const { data, isLoading } = useListParticipants(
    { search: debouncedSearch, page, limit: 25 },
    { query: { queryKey: getListParticipantsQueryKey({ search: debouncedSearch, page, limit: 25 }) } }
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/participants/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Import failed");
      setImportResult(result as ImportResult);
      setImportDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
    } catch (err: unknown) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  function openEdit(p: { id: number; name: string; mobile: string; email?: string | null; institution: string }) {
    setEditId(p.id);
    setEditForm({ name: p.name, mobile: p.mobile, email: p.email ?? "", institution: p.institution });
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editId) return;
    setEditSaving(true);
    try {
      const resp = await fetch(`/api/participants/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editForm.name.trim() || undefined,
          mobile: editForm.mobile.trim() || undefined,
          email: editForm.email.trim() || undefined,
          institution: editForm.institution.trim() || undefined,
        }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? "Update failed");
      }
      toast({ title: "Participant updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
      setEditOpen(false);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / 25) : 1;
  const from = (page - 1) * 25 + 1;
  const to = Math.min(page * 25, data?.total ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendees</h1>
          <p className="text-gray-500 mt-1">
            {data ? `${data.total} registered participants` : "Loading…"}
          </p>
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            className="gap-2 border-[#6F42C1] text-[#6F42C1] hover:bg-purple-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4" />
            {importing ? "Importing…" : "Upload Excel"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, reg no, mobile, email…"
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {data && (
              <span className="text-sm text-gray-500 shrink-0">
                {data.total} total
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Reg No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="w-36">Mobile</TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.participants && data.participants.length > 0 ? (
                  data.participants.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-semibold text-[#6F42C1] text-sm">{p.registrationNumber}</TableCell>
                      <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{p.institution}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-mono ${p.mobile?.startsWith("98") ? "text-amber-600" : "text-gray-700"}`}>
                          {p.mobile || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p as Parameters<typeof openEdit>[0])}>
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </Button>
                          <Link href={`/admin/participants/${p.id}`}>
                            <Button variant="ghost" size="icon" title="View details">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                      {search ? `No participants found matching "${search}"` : "No participants yet. Upload an Excel file to get started."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.total > 25 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {from}–{to} of {data.total}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Result Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#6F42C1]" />
              Excel Import Complete
            </DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">{importResult.skipped}</div>
                  <div className="text-sm text-gray-500">Skipped (duplicates)</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-red-700 mb-1">{importResult.errors.length} errors:</div>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 20).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportDialogOpen(false)} className="bg-[#F58220] hover:bg-[#e07010] text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <Input
                value={editForm.mobile}
                onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile"
              />
              <p className="text-xs text-amber-600">Auto-generated numbers start with 98 — update with actual mobile.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Institution</Label>
              <Input value={editForm.institution} onChange={(e) => setEditForm((f) => ({ ...f, institution: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="bg-[#F58220] hover:bg-[#e07010] text-white">
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
