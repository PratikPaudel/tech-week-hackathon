"use client"

import { useState, useEffect } from 'react'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useFoldersQuery, useCreateFolderMutation } from '@/lib/queries'
import { useQuickCaptureStore } from '@/lib/store'
import { useDashboardStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Folder, Search, Plus } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const quickCaptureSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().optional(),
    folderId: z.string().min(1, 'Please select a folder'),
})

type QuickCaptureFormData = z.infer<typeof quickCaptureSchema>

const supabase = createClient()

export function EnhancedQuickCaptureModal() {
    const { isOpen, close } = useQuickCaptureStore()
    const { activeFolderId } = useDashboardStore()
    const { data: folders, isLoading: foldersLoading } = useFoldersQuery()
    
    // Debug logging
    console.log('Folders data:', folders)
    console.log('Folders loading:', foldersLoading)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_createdNoteId, setCreatedNoteId] = useState<string | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_selectedFolderId, setSelectedFolderId] = useState<string>('')
    const [open, setOpen] = useState(false)
    const [isCreatingFolder, setIsCreatingFolder] = useState(false)
    const [showCreateFolder, setShowCreateFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const queryClient = useQueryClient()

    const createFolder = useCreateFolderMutation()

    // Get the default folder - prioritize active folder, then Inbox, then first available
    const defaultFolder = folders?.find(f => f.id === activeFolderId) || 
                         folders?.find(f => f.name.toLowerCase() === 'inbox') || 
                         folders?.[0]

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            toast.error('Please enter a folder name')
            return
        }
        
        setIsCreatingFolder(true)
        try {
            const newFolder = await createFolder.mutateAsync({
                name: newFolderName.trim(),
                description: '',
                tags: []
            })
            
            // Select the newly created folder
            form.setValue('folderId', newFolder.id)
            setSelectedFolderId(newFolder.id)
            setShowCreateFolder(false)
            setNewFolderName('')
            setOpen(false)
            
            toast.success(`Created folder "${newFolder.name}"`)
        } catch (error) {
            console.error('Failed to create folder:', error)
            toast.error('Failed to create folder')
        } finally {
            setIsCreatingFolder(false)
        }
    }

    const form = useForm<QuickCaptureFormData>({
        resolver: zodResolver(quickCaptureSchema),
        defaultValues: {
            title: '',
            content: '',
            folderId: defaultFolder?.id || '',
        },
    })

    // Update form when default folder changes
    useEffect(() => {
        if (defaultFolder?.id && !form.getValues('folderId')) {
            form.setValue('folderId', defaultFolder.id)
            setSelectedFolderId(defaultFolder.id)
        }
    }, [defaultFolder?.id, form])

    const onSubmit = async (data: QuickCaptureFormData) => {
        try {
            const targetFolderId = data.folderId
            
            if (!targetFolderId) {
                toast.error('Please select a folder')
                return
            }

            // Create the note using the raw Supabase client since we need dynamic folder ID
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) throw new Error('Not authenticated')

            const { data: newNote, error: noteError } = await supabase
                .from('notes')
                .insert({
                    folder_id: targetFolderId,
                    title: data.title,
                    content: data.content || '',
                    user_id: userData.user.id,
                })
                .select()
                .single()

            if (noteError) throw noteError

            // If content is provided, also create it as the first version/answer
            if (data.content && data.content.trim() && newNote.id) {
                const { error: versionError } = await supabase
                    .from('note_versions')
                    .insert({
                        note_id: newNote.id,
                        content: data.content,
                        version_label: null, // Don't set any default label
                        version_description: null, // Don't set any description
                        is_current: true,
                        is_default: true,
                        user_id: userData.user.id,
                    })

                if (versionError) throw versionError
            }

            // Invalidate queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['notes', targetFolderId] })
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            if (activeFolderId) {
                queryClient.invalidateQueries({ queryKey: ['notes', activeFolderId] })
            }

            // Reset form and close modal
            form.reset()
            setCreatedNoteId(null)
            setSelectedFolderId('')
            close()
            
            const folderName = folders?.find(f => f.id === targetFolderId)?.name || 'Inbox'
            toast.success(`Note created in ${folderName}!`)
        } catch (error) {
            console.error('Failed to create note:', error)
            toast.error('Failed to create note')
        }
    }

    const handleClose = () => {
        form.reset()
        setSelectedFolderId('')
        setShowCreateFolder(false)
        setNewFolderName('')
        close()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quick Capture</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="folderId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Folder</FormLabel>
                                    <Popover open={open} onOpenChange={(newOpen) => {
                                        console.log('Popover open changed:', newOpen)
                                        setOpen(newOpen)
                                    }}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    type="button"
                                                    onClick={() => {
                                                        console.log('Button clicked, current open state:', open)
                                                        setOpen(!open)
                                                    }}
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Folder className="h-4 w-4" />
                                                        {field.value
                                                            ? folders?.find((folder) => folder.id === field.value)?.name
                                                            : (!folders || folders.length === 0)
                                                            ? "Will create Inbox folder"
                                                            : "Select folder..."}
                                                    </div>
                                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search folders..." />
                                                <CommandEmpty>
                                                    {showCreateFolder ? (
                                                        <div className="p-2 space-y-2">
                                                            <Input
                                                                placeholder="New folder name..."
                                                                value={newFolderName}
                                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleCreateFolder()
                                                                    } else if (e.key === 'Escape') {
                                                                        setShowCreateFolder(false)
                                                                        setNewFolderName('')
                                                                    }
                                                                }}
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={handleCreateFolder}
                                                                    disabled={isCreatingFolder}
                                                                >
                                                                    {isCreatingFolder ? 'Creating...' : 'Create'}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setShowCreateFolder(false)
                                                                        setNewFolderName('')
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-2">
                                                            <Button
                                                                variant="ghost"
                                                                className="w-full justify-start"
                                                                onClick={() => setShowCreateFolder(true)}
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Create new folder...
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {folders?.map((folder) => (
                                                        <CommandItem
                                                            key={folder.id}
                                                            value={folder.name}
                                                            onSelect={() => {
                                                                console.log('Folder selected:', folder.name, folder.id)
                                                                form.setValue('folderId', folder.id)
                                                                setSelectedFolderId(folder.id)
                                                                setOpen(false)
                                                            }}
                                                        >
                                                            <Folder className="mr-2 h-4 w-4" />
                                                            {folder.name}
                                                            {folder.question_count > 0 && (
                                                                <span className="ml-auto text-xs text-muted-foreground">
                                                                    {folder.question_count} notes
                                                                </span>
                                                            )}
                                                        </CommandItem>
                                                    ))}
                                                    {!showCreateFolder && (
                                                        <CommandItem onSelect={() => {
                                                            console.log('Create new folder clicked')
                                                            setShowCreateFolder(true)
                                                        }}>
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Create new folder...
                                                        </CommandItem>
                                                    )}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter note title..."
                                            {...field}
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content (Answer)</FormLabel>
                                    <FormControl>
                                        <RichTextEditor
                                            content={field.value || ''}
                                            onChange={field.onChange}
                                            placeholder="Write your answer content..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isCreatingFolder}
                            >
                                {isCreatingFolder ? 'Creating Folder...' : 'Create Note'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}