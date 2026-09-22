'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/server/actions/auth'

const schema = z.object({
  email: z.string().min(1, 'И-мэйлээ оруулна уу').email('И-мэйл буруу байна'),
  password: z.string().min(6, 'Нууц үг хамгийн багадаа 6 тэмдэгт'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: FormValues) {
    setServerError(null)
    startTransition(async () => {
      const result = await signIn(values)
      if (!result.ok) {
        setServerError(result.error.message)
        return
      }
      router.replace(next && next.startsWith('/') ? next : '/admin')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">И-мэйл</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@cora.mn"
          {...register('email')}
        />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Нууц үг</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
      </Button>
    </form>
  )
}
