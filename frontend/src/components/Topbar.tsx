import { Bell, Plus, Search } from "lucide-react";

type TopbarProps = {
  onAddProject: () => void;
  onAddTask: () => void;
};

export function Topbar({ onAddProject, onAddTask }: TopbarProps) {
  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={18} />
        <input placeholder="Search projects, tasks, clients" />
      </label>
      <div className="topbar-actions">
        <button className="icon-button" title="Notifications">
          <Bell size={18} />
        </button>
        <button className="secondary-button" onClick={onAddTask}>
          <Plus size={17} />
          <span>Task</span>
        </button>
        <button className="primary-button" onClick={onAddProject}>
          <Plus size={17} />
          <span>Project</span>
        </button>
      </div>
    </header>
  );
}
