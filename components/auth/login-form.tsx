"use client"

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const supabase = createClient()

type LoginForm = z.input<typeof loginSchema>

export function LoginForm() {
    const form = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    })
    const router = useRouter()

    const onSubmit = async (values: LoginForm) => {
        try {
            const { error } = await supabase.auth.signInWithPassword(values)
            if (error) {
                form.setError('root', { message: error.message })
            } else {
                router.push('/dashboard')
            }
        } catch {
            form.setError('root', { message: 'An unexpected error occurred' })
        }
    }

    const handleDemoLogin = async () => {
        const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL
        const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD

        if (!demoEmail || !demoPassword) {
            form.setError('root', { message: 'Demo credentials not configured' })
            return
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: demoEmail,
                password: demoPassword,
            })
            if (error) {
                form.setError('root', { message: error.message })
            } else {
                router.push('/dashboard')
            }
        } catch {
            form.setError('root', { message: 'An unexpected error occurred' })
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm w-full space-y-3">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {form.formState.errors.root && (
                    <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
                )}
                <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                >
                    {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDemoLogin}
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                >
                    Demo Login (For Judges)
                </Button>
                <p className="text-sm text-gray-600 text-center">
                    No account? <Link href="/signup" className="text-blue-600 hover:underline">Create one</Link>
                </p>
            </form>
        </Form>
    )
}


