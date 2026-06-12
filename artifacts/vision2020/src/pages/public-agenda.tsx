import { useParams } from "wouter";
import { useGetPersonalAgenda, getGetPersonalAgendaQueryKey } from "@workspace/api-client-react";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar, MapPin, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function PublicAgenda() {
  const params = useParams<{ registrationNumber: string }>();
  const regNumber = params.registrationNumber;

  const { data: agenda, isLoading, error } = useGetPersonalAgenda(regNumber, {
    query: {
      enabled: !!regNumber,
      queryKey: getGetPersonalAgendaQueryKey(regNumber)
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 px-4 pb-12">
      <div className="max-w-4xl w-full mb-8">
        <img src={bannerImg} alt="Vision 2020 Conference Banner" className="w-full h-auto rounded-lg shadow-sm border border-gray-200" />
      </div>

      <div className="max-w-4xl w-full">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not load the agenda for registration number: {regNumber}. It may not exist.
            </AlertDescription>
          </Alert>
        ) : agenda ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-2xl font-bold text-gray-900">{agenda.name}</CardTitle>
                <div className="text-gray-500 mt-1">{agenda.institution}</div>
                <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block w-max mt-2">
                  {agenda.registrationNumber}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {agenda.assignments && agenda.assignments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[120px]">Date & Time</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Track / Session</TableHead>
                          <TableHead>Presentation / Details</TableHead>
                          <TableHead>Hall</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agenda.assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="align-top whitespace-nowrap">
                              {assignment.date && (
                                <div className="flex items-center text-sm text-gray-600 mb-1">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {assignment.date}
                                </div>
                              )}
                              {assignment.time && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {assignment.time}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                {assignment.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="font-medium text-gray-900">{assignment.track}</div>
                              {assignment.sessionName && (
                                <div className="text-sm text-gray-500 mt-1">{assignment.sessionName}</div>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              {assignment.presentationTitle ? (
                                <span className="text-sm text-gray-800 font-medium">
                                  {assignment.presentationTitle}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">No specific title</span>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              {assignment.hall && (
                                <div className="flex items-center text-sm text-gray-700">
                                  <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                  {assignment.hall}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No sessions or assignments found for this participant.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
