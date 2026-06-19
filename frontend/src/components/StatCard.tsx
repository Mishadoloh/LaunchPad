import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  tone: "green" | "blue" | "amber" | "rose";
};

export function StatCard({ label, value, trend, icon: Icon, tone }: StatCardProps) {
  return (
    <section className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </section>
  );
}
