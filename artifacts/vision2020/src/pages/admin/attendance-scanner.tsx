import { useState } from "react";
import { useScanAttendance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { QrCode, CheckCircle2, XCircle } from "lucide-react";
import { AttendanceScanResult } from "@workspace/api-client-react/src/generated/api.schemas";

export default function AttendanceScanner() {
  const [regNumber, setRegNumber] = useState("");
  const [scanResult, setScanResult] = useState<AttendanceScanResult | null>(null);
  
  const { toast } = useToast();
  
  const scanMutation = useScanAttendance();

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber) return;

    scanMutation.mutate({
      data: {
        registrationNumber: regNumber
      }
    }, {
      onSuccess: (data) => {
        setScanResult(data);
        setRegNumber(""); // Clear input for next scan
      },
      onError: (err: any) => {
        toast({
          title: "Scan Request Failed",
          description: err.message || "Could not process scan",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Scanner</h1>
        <p className="text-gray-500 mt-2">Scan participant QR or enter registration number manually</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="relative">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Scan QR or enter Registration Number"
                className="pl-10 text-lg py-6"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg" 
              disabled={scanMutation.isPending || !regNumber}
            >
              {scanMutation.isPending ? "Processing..." : "Mark Attendance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanResult && (
        <Card className={`border-2 ${
          scanResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
        }`}>
          <CardContent className="pt-6 text-center space-y-4">
            {scanResult.success ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-2xl font-bold text-green-700">Attendance Recorded</h3>
                  <p className="text-green-600 mt-1">{scanResult.message}</p>
                </div>
                {scanResult.participant && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                    <div className="font-bold text-lg">{scanResult.participant.name}</div>
                    <div className="text-sm text-gray-600">{scanResult.participant.institution}</div>
                    <div className="font-mono mt-2 text-gray-500">{scanResult.participant.registrationNumber}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <div>
                  <h3 className="text-2xl font-bold text-red-700">Scan Failed</h3>
                  <p className="text-red-600 mt-1">{scanResult.message}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
