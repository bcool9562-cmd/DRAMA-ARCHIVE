import AppShell from '@/components/AppShell'

// This page uses Supabase auth on the client — disable static prerendering
export const dynamic = 'force-dynamic'

export default function Home() {
  return <AppShell />
}
