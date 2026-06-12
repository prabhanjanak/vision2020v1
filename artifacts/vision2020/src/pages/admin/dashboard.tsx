import { useState } from "react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useUpdateSubmissionSettings, useGetSubmissionSettings, getGetSubmissionSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Utensils, QrCode, Activity, SwitchCamera, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: {
      refetchInterval: 30000,
    }
  });

  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: {
      refetchInterval: 30000,
    }
  });

  const { data: settings, isLoading: settingsLoading } = useGetSubmissionSettings();
  
  const updateSettingsMutation = useUpdateSubmissionSettings();

  const handleToggleSubmissions = (open: boolean) => {
    updateSettingsMutation.mutate({
      data: { submissionsOpen: open }
    }, {
      onSuccess: () => {
        toast({ title: `Submissions ${open ? 'opened' : 'closed'} successfully` });
        queryClient.invalidateQueries({ queryKey: getGetSubmissionSettingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to update settings", 
          description: err.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Live overview of conference activity</p>
        </div>
        
        <Card className="w-full sm:w-auto bg-white/50 shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between gap-6">
            <div>
              <Label htmlFor="submissions-toggle" className="text-sm font-medium mb-1 block cursor-pointer">
                File Submissions
              </Label>
              <div className="text-xs text-gray-500">
                {settings?.submissionsOpen ? "Currently Open" : "Currently Closed"}
              </div>
            </div>
            {settingsLoading || updateSettingsMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : (
              <Switch 
                id="submissions-toggle" 
                checked={settings?.submissionsOpen || false}
                onCheckedChange={handleToggleSubmissions}
                disabled={updateSettingsMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Registrations</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalRegistrations}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Checked In (Attendance)</CardTitle>
              <QrCode className="w-4 h-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAttendance}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalRegistrations > 0 
                  ? `${Math.round((stats.totalAttendance / stats.totalRegistrations) * 100)}% of registered`
                  : "0%"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">PPT Submissions</CardTitle>
              <FileText className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.pptSubmissions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Poster Submissions</CardTitle>
              <FileText className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.posterSubmissions}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Utensils className="w-5 h-5 text-gray-500" /> 
                Food Collection Live Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48" />
              ) : stats?.foodStats && stats.foodStats.length > 0 ? (
                <div className="space-y-4">
                  {stats.foodStats.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="font-medium text-gray-700">{item.sessionName}</div>
                      <div className="text-xl font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                        {item.count} <span className="text-sm font-normal text-gray-500 ml-1">served</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No active food sessions today</div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Role Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-32" />
                ) : stats?.roleBreakdown ? (
                  <div className="space-y-2">
                    {stats.roleBreakdown.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.role}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Top Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-32" />
                ) : stats?.trackBreakdown ? (
                  <div className="space-y-2">
                    {stats.trackBreakdown.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate mr-2">{item.track}</span>
                        <span className="font-medium shrink-0">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-500" />
                Recent Activity
              </CardTitle>
              <CardDescription>Live updates from the floor</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {activityLoading ? (
                <div className="px-6 space-y-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {activity.map(item => (
                    <div key={item.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="text-sm text-gray-800">{item.message}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
