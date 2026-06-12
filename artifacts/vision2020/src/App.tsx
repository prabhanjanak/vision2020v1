import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SetPassword from "@/pages/set-password";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import PublicAgenda from "@/pages/public-agenda";
import NotFound from "@/pages/not-found";

import ParticipantDashboard from "@/pages/participant/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminParticipants from "@/pages/admin/participants";
import AdminParticipantDetail from "@/pages/admin/participants/detail";
import FoodSessions from "@/pages/admin/food-sessions";
import FoodScanner from "@/pages/admin/food-scanner";
import FoodLogs from "@/pages/admin/food-logs";
import AttendanceScanner from "@/pages/admin/attendance-scanner";
import AttendanceLogs from "@/pages/admin/attendance-logs";
import SystemUsers from "@/pages/admin/system-users";
import CoordinatorDashboard from "@/pages/coordinator/dashboard";
import ScientificSubmissions from "@/pages/scientific/submissions";
import StaffChangePassword from "@/pages/staff/change-password";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/set-password" component={SetPassword} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      <Route path="/participant/dashboard">
        {() => <AppLayout><ParticipantDashboard /></AppLayout>}
      </Route>
      <Route path="/admin/dashboard">
        {() => <AppLayout><AdminDashboard /></AppLayout>}
      </Route>
      <Route path="/admin/participants">
        {() => <AppLayout><AdminParticipants /></AppLayout>}
      </Route>
      <Route path="/admin/participants/:id">
        {() => <AppLayout><AdminParticipantDetail /></AppLayout>}
      </Route>
      <Route path="/admin/food-sessions">
        {() => <AppLayout><FoodSessions /></AppLayout>}
      </Route>
      <Route path="/admin/food-scanner">
        {() => <AppLayout><FoodScanner /></AppLayout>}
      </Route>
      <Route path="/admin/food-logs">
        {() => <AppLayout><FoodLogs /></AppLayout>}
      </Route>
      <Route path="/admin/attendance-scanner">
        {() => <AppLayout><AttendanceScanner /></AppLayout>}
      </Route>
      <Route path="/admin/attendance-logs">
        {() => <AppLayout><AttendanceLogs /></AppLayout>}
      </Route>
      <Route path="/admin/system-users">
        {() => <AppLayout><SystemUsers /></AppLayout>}
      </Route>
      <Route path="/coordinator/dashboard">
        {() => <AppLayout><CoordinatorDashboard /></AppLayout>}
      </Route>
      <Route path="/scientific/submissions">
        {() => <AppLayout><ScientificSubmissions /></AppLayout>}
      </Route>
      
      <Route path="/staff/change-password" component={StaffChangePassword} />
      
      <Route path="/agenda/:registrationNumber" component={PublicAgenda} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
