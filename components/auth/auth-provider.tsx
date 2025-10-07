"use client"

import { createClient } from '@/lib/supabase/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const supabase = createClient()

type AuthUser = {
    id: string
    email?: string
} | null

type AuthContextValue = {
    user: AuthUser
    loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())
    const [user, setUser] = useState<AuthUser>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            const { data } = await supabase.auth.getUser()
            const u = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null
            setUser(u)
            setLoading(false)
        }
        init()
        const { data: sub } = supabase.auth.onAuthStateChange((_event: unknown, session) => {
            const u = session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null
            setUser(u)
        })
        return () => {
            sub.subscription.unsubscribe()
        }
    }, [])

    const value = useMemo(() => ({ user, loading }), [user, loading])

    return (
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
        </QueryClientProvider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}


