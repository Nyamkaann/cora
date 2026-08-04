import { SidebarNav } from "./SidebarNav";
import type { UserRole } from "@/types/next-auth";

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
      <div className="sticky top-0 flex h-full flex-col p-4">
        <SidebarNav role={role} />
      </div>
    </aside>
  );
}
