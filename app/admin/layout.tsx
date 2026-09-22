import Link from 'next/link'

import { requireUser } from '@/lib/auth'
import { MobileNav } from '@/components/admin/mobile-nav'
import { SidebarNav } from '@/components/admin/sidebar-nav'
import { SignOutButton } from '@/components/admin/sign-out-button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="min-h-svh bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-background lg:flex">
        <div className="flex h-14 items-center border-b px-5">
          <Link href="/admin" className="font-heading text-lg font-semibold">
            Cora
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
          <MobileNav />
          <Link href="/admin" className="font-heading text-base font-semibold lg:hidden">
            Cora
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
