import { useParams, Link } from "wouter";
import { useGetParticipant, getGetParticipantQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Calendar, MapPin, Clock } from "lucide-react";

export default function AdminParticipantDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);

  const { data: participant, isLoading } = useGetParticipant(id, {
    query: {
      enabled: !!id,
      queryKey: getGetParticipantQueryKey(id)
    }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/participants">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Participant Details</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : participant ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div>
                <CardTitle className="text-2xl">{participant.name}</CardTitle>
                <div className="text-gray-500 mt-1">{participant.institution}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Registration No.</div>
                <div className="font-mono font-bold text-lg text-primary">{participant.registrationNumber}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="mt-1">{participant.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Mobile</div>
                  <div className="mt-1">{participant.mobile}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Account Status</div>
                  <div className="mt-1">
                    {participant.hasPassword ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending Setup</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100">
              <CardTitle>Assignments & Sessions</CardTitle>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit className="w-4 h-4" /> Manage Assignments
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {participant.assignments && participant.assignments.length > 0 ? (
                <div className="space-y-4">
                  {participant.assignments.map(assignment => (
                    <div key={assignment.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-white border-primary/20 text-primary">
                          {assignment.role}
                        </Badge>
                        <span className="text-sm font-medium text-gray-600">{assignment.track}</span>
                      </div>
                      
                      {(assignment.sessionName || assignment.presentationTitle) && (
                        <div className="mb-3 space-y-1">
                          {assignment.presentationTitle && (
                            <h4 className="font-semibold text-gray-900">{assignment.presentationTitle}</h4>
                          )}
                          {assignment.sessionName && (
                            <div className="text-sm text-gray-600">{assignment.sessionName}</div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                        {assignment.date && <div><strong className="text-gray-700">Date:</strong> {assignment.date}</div>}
                        {assignment.time && <div><strong className="text-gray-700">Time:</strong> {assignment.time}</div>}
                        {assignment.hall && <div><strong className="text-gray-700">Hall:</strong> {assignment.hall}</div>}
                      </div>
                      
                      {assignment.uploadedFile && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-sm flex items-center justify-between">
                            <span className="text-green-600 font-medium">File Uploaded: {assignment.uploadedFile.originalName}</span>
                            <Button variant="link" size="sm" onClick={() => window.open(`/api/assignments/${assignment.id}/file/download`, '_blank')}>
                              Download
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No assignments for this participant.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">Participant not found.</div>
      )}
    </div>
  );
}
