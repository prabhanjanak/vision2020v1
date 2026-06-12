import { useState } from "react";
import { useListFoodSessions, useCreateFoodSession, useUpdateFoodSession, useDeleteFoodSession, useToggleFoodSession, getListFoodSessionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function FoodSessions() {
  const { data: sessions, isLoading } = useListFoodSessions();
  const toggleMutation = useToggleFoodSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleToggle = (id: number, enabled: boolean) => {
    toggleMutation.mutate({
      id,
      data: { enabled }
    }, {
      onSuccess: () => {
        toast({ title: `Session ${enabled ? 'enabled' : 'disabled'}` });
        queryClient.invalidateQueries({ queryKey: getListFoodSessionsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to toggle session", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Food Sessions</h1>
          <p className="text-gray-500 mt-1">Manage breakfast, lunch, and dinner scanning sessions</p>
        </div>
        
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Add Session
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Active Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1,2,3].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sessions && sessions.length > 0 ? (
                  sessions.map(session => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.name}</TableCell>
                      <TableCell>{session.date}</TableCell>
                      <TableCell>{session.startTime} - {session.endTime}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={session.enabled} 
                          onCheckedChange={(checked) => handleToggle(session.id, checked)}
                          disabled={toggleMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Edit">
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                      No food sessions configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
