import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, LayoutDashboard, Users, Utensils, QrCode, ClipboardList, Database, FileText } from "lucide-react";
import bannerImg from "@assets/top-banner-2026_1781259297844.webp";

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const getNavItems = () => {
    switch (user.userType) {
      case "admin":
        return [
          { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
          { label: "Participants", href: "/admin/participants", icon: Users },
          { label: "Food Sessions", href: "/admin/food-sessions", icon: Utensils },
          { label: "Food Scanner", href: "/admin/food-scanner", icon: QrCode },
          { label: "Food Logs", href: "/admin/food-logs", icon: ClipboardList },
          { label: "Attendance Scanner", href: "/admin/attendance-scanner", icon: QrCode },
          { label: "Attendance Logs", href: "/admin/attendance-logs", icon: ClipboardList },
          { label: "System Users", href: "/admin/system-users", icon: Database },
        ];
      case "participant":
        return [
          { label: "Dashboard", href: "/participant/dashboard", icon: LayoutDashboard },
        ];
      case "track_coordinator":
        return [
          { label: "Dashboard", href: "/coordinator/dashboard", icon: LayoutDashboard },
        ];
      case "food_coordinator":
        return [
          { label: "Scanner", href: "/admin/food-scanner", icon: QrCode },
        ];
      case "scientific_committee":
        return [
          { label: "Submissions", href: "/scientific/submissions", icon: FileText },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="w-full">
          <img src={bannerImg} alt="Vision 2020 Conference Banner" className="w-full h-auto object-cover max-h-32" />
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Conference System</h1>
            <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-md capitalize">
              {user.userType.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">{user.name}</span>
            <button
              onClick={() => logout()}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
