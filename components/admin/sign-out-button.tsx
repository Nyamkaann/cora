'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/server/actions/auth'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">Гарах</span>
    </Button>
  )
}
