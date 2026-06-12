import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetParticipant, getGetParticipantQueryKey, useGetParticipantQR, getGetParticipantQRQueryKey, useUploadFile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "recharts";

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const participantId = user?.participantId;

  const { data: participant, isLoading } = useGetParticipant(participantId as number, {
    query: {
      enabled: !!participantId,
      queryKey: getGetParticipantQueryKey(participantId as number)
    }
  });

  const { data: qrcodes, isLoading: isQRLoading } = useGetParticipantQR(participantId as number, {
    query: {
      enabled: !!participantId,
      queryKey: getGetParticipantQRQueryKey(participantId as number)
    }
  });

  const [uploadingAssignmentId, setUploadingAssignmentId] = useState<number | null>(null);

  const handleFileUpload = async (assignmentId: number, file: File) => {
    setUploadingAssignmentId(assignmentId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/assignments/${assignmentId}/file`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("vision2020_token")}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      toast({ title: "File uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: getGetParticipantQueryKey(participantId as number) });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setUploadingAssignmentId(null);
    }
  };

  if (!user || !participantId) return <div className="p-8">Participant data not found.</div>;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {participant?.name}</h1>
          <p className="text-gray-500 mt-1">Vision 2020 Conference Participant Dashboard</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-sm text-gray-500">Registration Number</div>
          <div className="text-xl font-mono font-bold text-primary">{participant?.registrationNumber}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <div className="text-sm font-medium text-gray-500">Institution</div>
                  <div className="mt-1 font-medium">{participant?.institution}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="mt-1 font-medium">{participant?.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Mobile</div>
                  <div className="mt-1 font-medium">{participant?.mobile}</div>
                </div>
                <div className="sm:hidden">
                  <div className="text-sm font-medium text-gray-500">Registration No.</div>
                  <div className="mt-1 font-mono font-medium text-primary">{participant?.registrationNumber}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle>Your Assignments & Sessions</CardTitle>
              <CardDescription>View your schedule and upload required files (PPT/Posters)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {participant?.assignments && participant.assignments.length > 0 ? (
                <div className="space-y-6">
                  {participant.assignments.map(assignment => {
                    const needsFile = ["Speaker", "Presenter", "PosterPresenter"].includes(assignment.role);
                    
                    return (
                      <div key={assignment.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
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
                          </div>
                          
                          {needsFile && (
                            <div className="sm:text-right flex flex-col items-start sm:items-end gap-2 shrink-0">
                              {assignment.uploadedFile ? (
                                <div className="flex items-center text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-md border border-green-100">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  File Uploaded
                                </div>
                              ) : (
                                <div className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100">
                                  File Required
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 mt-2">
                                <Label htmlFor={`file-upload-${assignment.id}`} className="cursor-pointer">
                                  <div className="flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                                    <Upload className="w-4 h-4 mr-2" />
                                    {assignment.uploadedFile ? "Replace File" : "Upload File"}
                                  </div>
                                  <Input 
                                    id={`file-upload-${assignment.id}`} 
                                    type="file" 
                                    className="hidden" 
                                    accept={assignment.role === "PosterPresenter" ? ".jpg,.jpeg,.png" : ".ppt,.pptx,.pdf"}
                                    disabled={uploadingAssignmentId === assignment.id}
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleFileUpload(assignment.id, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </Label>
                                
                                {assignment.uploadedFile && (
                                  <Button variant="outline" size="sm" onClick={() => {
                                    window.open(`/api/assignments/${assignment.id}/file/download`, '_blank');
                                  }}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  You have no assigned sessions at this time.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground pb-4">
              <CardTitle className="text-lg">Your Conference Badges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isQRLoading ? (
                <div className="p-6 flex justify-center"><Skeleton className="w-48 h-48" /></div>
              ) : qrcodes ? (
                <Tabs defaultValue="qr1" className="w-full">
                  <div className="px-4 pt-4">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="qr1">Registration</TabsTrigger>
                      <TabsTrigger value="qr2">Food</TabsTrigger>
                      <TabsTrigger value="qr3">Agenda</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="qr1" className="p-6 pt-2 flex flex-col items-center">
                    <h3 className="text-center font-medium text-gray-900 mb-4">{qrcodes.qr1.label}</h3>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                      <img src={qrcodes.qr1.dataUrl} alt="QR Code 1" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-center text-gray-500 mb-4 px-4">
                      Present this code at the registration desk upon arrival to collect your physical badge.
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={qrcodes.qr1.dataUrl} download={qrcodes.qr1.downloadName}>
                        <Download className="w-4 h-4 mr-2" /> Download Badge
                      </a>
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="qr2" className="p-6 pt-2 flex flex-col items-center">
                    <h3 className="text-center font-medium text-gray-900 mb-4">{qrcodes.qr2.label}</h3>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                      <img src={qrcodes.qr2.dataUrl} alt="QR Code 2" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-center text-gray-500 mb-4 px-4">
                      Present this code at dining halls for breakfast, lunch, and dinner access.
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={qrcodes.qr2.dataUrl} download={qrcodes.qr2.downloadName}>
                        <Download className="w-4 h-4 mr-2" /> Download Badge
                      </a>
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="qr3" className="p-6 pt-2 flex flex-col items-center">
                    <h3 className="text-center font-medium text-gray-900 mb-4">{qrcodes.qr3.label}</h3>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                      <img src={qrcodes.qr3.dataUrl} alt="QR Code 3" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-center text-gray-500 mb-4 px-4">
                      Anyone scanning this code can view your public personal agenda page.
                    </p>
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" className="flex-1" asChild>
                        <a href={qrcodes.qr3.dataUrl} download={qrcodes.qr3.downloadName}>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button variant="outline" className="flex-[3]" asChild>
                        <a href={`/agenda/${participant?.registrationNumber}`} target="_blank">
                          <Eye className="w-4 h-4 mr-2" /> View Public Page
                        </a>
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="p-8 text-center text-gray-500">Could not load QR codes</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
