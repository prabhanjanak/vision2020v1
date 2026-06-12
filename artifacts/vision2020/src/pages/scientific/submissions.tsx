import { useState } from "react";
import { useListSubmissions, getListSubmissionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, FileText, Image as ImageIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function ScientificSubmissions() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: submissions, isLoading } = useListSubmissions({
    search: debouncedSearch
  }, {
    query: {
      queryKey: getListSubmissionsQueryKey({ search: debouncedSearch })
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scientific Submissions</h1>
          <p className="text-gray-500 mt-1">Review all uploaded presentations and posters</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search by participant, title, track..." 
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
                  <TableHead>Type</TableHead>
                  <TableHead>Track & Role</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : submissions && submissions.length > 0 ? (
                  submissions.map(sub => (
                    <TableRow key={sub.fileId}>
                      <TableCell>
                        {sub.fileType === "pptx" ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
                            <FileText className="w-3 h-3" /> PPTX
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                            <ImageIcon className="w-3 h-3" /> JPG
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{sub.track}</div>
                        <div className="text-xs text-gray-500">{sub.role}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{sub.registrationNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900 max-w-xs truncate" title={sub.presentationTitle || ""}>
                          {sub.presentationTitle || "No title"}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{sub.filename}</div>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(sub.uploadedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <a href={`/api/assignments/${sub.fileId}/file/download`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" /> Download
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      No submissions found.
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
