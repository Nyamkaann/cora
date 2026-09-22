import { redirect } from 'next/navigation'

export default function HomePage() {
  // The MVP has no public storefront: everything lives under /admin.
  redirect('/admin')
}
