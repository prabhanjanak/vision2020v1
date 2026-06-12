import { useState } from "react";
import { useListTrackParticipants, getListTrackParticipantsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Download, CheckCircle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "react-day-picker";

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const trackName = user?.assignedTrack || "";

  const { data: participants, isLoading } = useListTrackParticipants({
    trackName,
    search: debouncedSearch
  }, {
    query: {
      enabled: !!trackName,
      queryKey: getListTrackParticipantsQueryKey({ trackName, search: debouncedSearch })
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Managing <span className="font-semibold text-primary">{trackName || "No Track Assigned"}</span>
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search participant or session..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Session & Title</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : participants && participants.length > 0 ? (
                  participants.map((p, i) => (
                    <TableRow key={`${p.participantId}-${i}`}>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                          {p.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.institution}</div>
                      </TableCell>
                      <TableCell>
                        {p.presentationTitle && <div className="font-medium text-gray-900">{p.presentationTitle}</div>}
                        {p.sessionName && <div className="text-sm text-gray-600">{p.sessionName}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 whitespace-nowrap">
                          {p.date && <div>{p.date}</div>}
                          {p.time && <div>{p.time}</div>}
                          {p.hall && <div className="text-gray-400">{p.hall}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.hasFile && p.fileId ? (
                          <a href={`/api/assignments/${p.fileId}/file/download`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                              <Download className="w-4 h-4 mr-2" /> Download
                            </Button>
                          </a>
                        ) : ["Speaker", "Presenter", "PosterPresenter"].includes(p.role) ? (
                          <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">
                            Pending
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                      No participants found for this track.
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
