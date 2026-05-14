import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useRef } from "react";
import { LayoutDashboard, FileText, PlusCircle, LogOut, ChevronUp, Users, Shield } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarFooter } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useListCases } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  viewer: "Viewer",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isAdmin, isViewer, role } = useUserRole();
  const { toast } = useToast();

  const { data: processingCases } = useListCases(
    { status: "processing" },
    {
      query: {
        enabled: true,
        queryKey: ["processing-cases"],
        refetchInterval: 5000,
      },
    }
  );

  const activeCases = useMemo(() => processingCases ?? [], [processingCases]);
  const prevCaseIds = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const currentIds = new Map(activeCases.map((c) => [c.id, c.caseNumber]));
    if (prevCaseIds.current.size > 0) {
      const completed: string[] = [];
      for (const [id, caseNumber] of prevCaseIds.current.entries()) {
        if (!currentIds.has(id)) {
          completed.push(caseNumber);
        }
      }
      if (completed.length > 0) {
        toast({
          title: "Processing complete",
          description: `Directives generated for: ${completed.slice(0, 3).join(", ")}${completed.length > 3 ? "…" : ""}`,
        });
      }
    }
    prevCaseIds.current = currentIds;
  }, [activeCases, toast]);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden w-full">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <h1 className="text-xl font-serif font-bold text-amber-500 tracking-tight flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center text-sidebar font-sans text-xs">V</div>
              VerdictIQ
            </h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="mt-4 px-2 gap-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/cases") && location !== "/cases/new"}>
                  <Link href="/cases">
                    <FileText className="mr-2 h-4 w-4" />
                    Cases
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!isViewer && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/cases/new"}>
                    <Link href="/cases/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Case
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/admin")}>
                    <Link href="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Users
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sidebar font-semibold text-sm flex-shrink-0">
                    {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                      {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress ?? "User"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-400 font-medium">
                        {role ? ROLE_LABELS[role] : "…"}
                      </p>
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.fullName ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress}</p>
                  {role && (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">{ROLE_LABELS[role]}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-y-auto bg-background text-foreground flex flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-end px-6 py-3 border-b bg-background/95 backdrop-blur">
            <div className="min-w-[260px] rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider">AI Processing</span>
                <span className="font-semibold text-foreground">{activeCases.length}</span>
              </div>
              {activeCases.length > 0 ? (
                <div className="mt-1 text-foreground/80">
                  {activeCases.slice(0, 2).map((c) => c.caseNumber).join(", ")}
                  {activeCases.length > 2 ? "…" : ""}
                </div>
              ) : (
                <div className="mt-1">No active extractions</div>
              )}
            </div>
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
