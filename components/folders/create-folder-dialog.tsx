"use client"

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateFolderMutation } from '@/lib/queries'
import { createFolderSchema } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

type CreateFolderForm = z.input<typeof createFolderSchema>

export function CreateFolderDialog() {
    const [open, setOpen] = useState(false)
    const form = useForm<CreateFolderForm>({
        resolver: zodResolver(createFolderSchema),
        defaultValues: { name: '', description: '', tags: [] },
    })
    const { mutateAsync, isPending } = useCreateFolderMutation()

    const onSubmit = async (values: CreateFolderForm) => {
        try {
            await mutateAsync(values)
            setOpen(false)
            form.reset()
        } catch (err: unknown) {
            // Error toast is handled by the mutation
            console.error('Create folder error:', err)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">New Folder</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create folder</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Job Interview Prep" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Optional description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-2">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Creating…' : 'Create'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}


