// Filename: lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase environment variables not found. Using mock client.')
        // Return a mock client during build time to prevent errors
        return {
            auth: {
                signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
                signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
                signOut: () => Promise.resolve({ error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
            },
            from: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
                insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
                update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
                delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
        } as unknown as SupabaseClient
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
