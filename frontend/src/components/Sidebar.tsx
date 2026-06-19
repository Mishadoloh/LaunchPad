import { BarChart3, BriefcaseBusiness, FolderKanban, LayoutDashboard, LogOut, Settings, UsersRound } from "lucide-react";
import type { ApiUser } from "@launchpad/shared";

export type WorkspaceView = "dashboard" | "projects" | "operations" | "reports" | "team" | "settings";

type SidebarProps = {
  user: ApiUser;
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onSignOut: () => void;
};

const navItems = [
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Projects", view: "projects", icon: FolderKanban },
  { label: "Operations", view: "operations", icon: BriefcaseBusiness },
  { label: "Reports", view: "reports", icon: BarChart3 },
  { label: "Team", view: "team", icon: UsersRound },
  { label: "Settings", view: "settings", icon: Settings }
] satisfies Array<{ label: string; view: WorkspaceView; icon: typeof LayoutDashboard }>;

export function Sidebar({ user, activeView, onViewChange, onSignOut }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">LP</div>
        <div>
          <strong>LaunchPad</strong>
          <span>Studio OS</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {navItems.map((item) => (
          <button
            className={activeView === item.view ? "nav-item active" : "nav-item"}
            key={item.label}
            title={item.label}
            onClick={() => onViewChange(item.view)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <img src={user.avatarUrl ?? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=faces"} alt="" />
        <div>
          <strong>{user.name}</strong>
          <span>{user.role.toLowerCase()}</span>
        </div>
      </div>

      <button className="ghost-button full" onClick={onSignOut}>
        <LogOut size={17} />
        <span>Sign out</span>
      </button>
    </aside>
  );
}
