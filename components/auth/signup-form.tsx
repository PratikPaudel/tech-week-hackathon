"use client"

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { signupSchema } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const supabase = createClient()

type SignupForm = z.input<typeof signupSchema>

export function SignupForm() {
    const form = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        defaultValues: { email: '', password: '', confirm: '' },
    })

    const onSubmit = async (values: SignupForm) => {
        try {
            const { error } = await supabase.auth.signUp({ email: values.email, password: values.password })
            if (error) {
                form.setError('root', { message: error.message })
            } else {
                // If email confirmations are required, the user must confirm before they can sign in
                form.setError('root', {
                    message: 'Check your email to confirm your account, then sign in.',
                    type: 'success'
                })
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
                <FormField
                    control={form.control}
                    name="confirm"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {form.formState.errors.root && (
                    <p className={`text-sm ${form.formState.errors.root.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {form.formState.errors.root.message}
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                >
                    {form.formState.isSubmitting ? 'Signing up…' : 'Create Account'}
                </Button>
            </form>
        </Form>
    )
}


