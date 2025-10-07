"use client"

import { createClient } from '@/lib/supabase/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generateEmbedding } from './embeddings'
import type {
  NoteVersion,
  CreateVersionInput,
  UpdateVersionInput
} from './types/versioning'

const supabase = createClient()

export const useFoldersQuery = () => {
    return useQuery({
        queryKey: ['folders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('folders_with_stats')
                .select('*')
                .order('order_index', { ascending: false })
                .order('updated_at', { ascending: false })
            if (error) throw error
            return data as Array<{
                id: string
                name: string
                description: string | null
                tags: string[] | null
                order_index: number | null
                created_at: string
                updated_at: string
                question_count: number // Still using this alias for now
                answered_count: number
                parent_folder_id: string | null
            }>
        },
    })
}

export const useSearchNotesQuery = (
    q: string,
    folderId?: string | null,
    tags?: string[] | null,
    page = 1,
    pageSize = 20
) => {
    return useQuery({
        queryKey: ['search', q, folderId ?? null, tags ?? null, page, pageSize],
        queryFn: async () => {
            if (!q.trim()) return [] as Array<{
                note_id: string
                folder_id: string
                title: string
                content: string | null
                rank: number
                snippet_title: string | null
                snippet_content: string | null
                created_at: string
                updated_at: string
            }>
            // Use RPC when only folder filter is applied (no tags)
            if (!tags || tags.length === 0) {
                const rpc = await supabase.rpc('search_notes', { q, folder: folderId ?? null, page, page_size: pageSize })
                if (!rpc.error && rpc.data && rpc.data.length > 0) {
                    return rpc.data as Array<{
                        note_id: string
                        folder_id: string
                        title: string
                        content: string | null
                        rank: number
                        snippet_title: string | null
                        snippet_content: string | null
                        created_at: string
                        updated_at: string
                    }>
                }
            }
            // Fallback: simple search on view with optional tags filter
            const term = `%${q}%`
            let query = supabase
                .from('notes_view')
                .select('*')
                .or(`title.ilike.${term},content.ilike.${term}`)
                .order('created_at', { ascending: false })
                .limit(pageSize)
            if (folderId) query = query.eq('folder_id', folderId)
            if (tags && tags.length > 0) query = query.contains('tags', tags)
            const { data: fbData, error: fbErr } = await query
            if (fbErr) throw fbErr
            return (fbData ?? []).map((row: {
                id: string
                folder_id: string
                title: string
                content: string | null
                created_at: string
                updated_at?: string | null
            }) => ({
                note_id: row.id,
                folder_id: row.folder_id,
                title: row.title,
                content: row.content ?? null,
                rank: 0,
                snippet_title: null,
                snippet_content: null,
                created_at: row.created_at,
                updated_at: row.updated_at ?? row.created_at,
            }))
        },
    })
}

export const useFavoriteNotesQuery = () => {
    return useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notes_view')
                .select('*')
                .eq('favorite', true)
                .order('order_index', { ascending: false })
                .order('created_at', { ascending: true })
            if (error) throw error
            return data as Array<{
                id: string
                folder_id: string
                title: string
                content: string | null
                created_at: string
                order_index?: number | null
                folder_name: string
                favorite: boolean
            }>
        }
    })
}

export const useVectorSearchQuery = (query: string) => {
    return useQuery({
        queryKey: ['vector-search', query],
        queryFn: async () => {
            if (!query.trim()) return []

            try {
                // 1. Generate the embedding for the search query in the browser
                const queryEmbedding = await generateEmbedding(query);

                // If embedding generation failed, return empty results
                if (!queryEmbedding) {
                    console.warn('Embedding generation failed, skipping vector search');
                    return [];
                }

                // 2. Call the Supabase RPC function directly with the vector
                const { data, error } = await supabase.rpc('match_notes', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.3, // Lower threshold for better recall
                    match_count: 5,
                });

                if (error) {
                    console.error("Vector search RPC error:", error);
                    throw new Error(error.message);
                }

                // Log the frontend results
                console.log('🎯 Frontend Vector Search Results:', {
                    query,
                    results_count: data?.length || 0,
                    results: data?.map((item: { id: string; title: string; similarity: number; folder_id: string }) => ({
                        id: item.id,
                        title: item.title,
                        similarity: item.similarity,
                        folder_id: item.folder_id
                    }))
                })

                return data as Array<{
                    id: string
                    title: string
                    content: string
                    similarity: number
                    folder_id: string
                }>
            } catch (error) {
                console.error('Vector search failed:', error);
                // Return empty array instead of throwing to prevent UI crashes
                return []
            }
        },
        enabled: query.trim().length > 2, // Only run for queries with 3+ characters
        staleTime: 1000 * 60, // Cache results for 1 minute
        retry: 1, // Only retry once to avoid infinite loops
    })
}

export const useAllTagsQuery = () => {
    return useQuery({
        queryKey: ['all-tags'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_tags_with_counts')
            if (error) throw new Error(error.message)
            return data as Array<{
                tag: string
                note_count: number
            }>
        },
    })
}

export const useNotesByTagQuery = (tag: string) => {
    return useQuery({
        queryKey: ['notes-by-tag', tag],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_notes_by_tag', { tag_name: tag })
            if (error) throw new Error(error.message)
            return data as Array<{
                id: string
                title: string
                folder_id: string
                folder_name: string
            }>
        },
        enabled: !!tag,
    })
}

export const useRecentNotesQuery = (limit = 5) => {
    return useQuery({
        queryKey: ['recent-notes', limit],
        queryFn: async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) throw new Error("User not found")
            const { data, error } = await supabase
                .from('notes')
                .select('id, title, folder_id, created_at')
                .eq('user_id', userData.user.id)
                .order('created_at', { ascending: false })
                .limit(limit)
            if (error) throw new Error(error.message)
            return data as Array<{
                id: string
                title: string
                folder_id: string
                created_at: string
            }>
        },
    })
}

type CreateFolderInput = {
    name: string
    description?: string | null
    tags?: string[]
}

export const useCreateFolderMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (folder: CreateFolderInput) => {
            const { data: userData, error: userErr } = await supabase.auth.getUser()
            if (userErr || !userData.user) throw userErr ?? new Error('Not authenticated')
            
            // Get the highest order_index for new folders to appear at the top
            const { data: existingFolders } = await supabase
                .from('folders')
                .select('order_index')
                .eq('user_id', userData.user.id)
                .order('order_index', { ascending: false })
                .limit(1)
            
            const highestOrderIndex = existingFolders?.[0]?.order_index ?? 0
            
            const payload = {
                name: folder.name,
                description: folder.description ?? null,
                tags: folder.tags ?? [],
                order_index: highestOrderIndex + 1,
                user_id: userData.user.id,
            }
            const { data, error } = await supabase
                .from('folders')
                .insert(payload)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onError: () => {
            toast.error('Failed to create folder')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success('Folder created successfully')
        },
    })
}

export const useFolderByIdQuery = (folderId: string) => {
    return useQuery({
        queryKey: ['folder', folderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('folders')
                .select('*')
                .eq('id', folderId)
                .single()
            if (error) throw error
            return data as { id: string; name: string; description: string | null; tags: string[] | null }
        },
        enabled: Boolean(folderId),
    })
}

export const useNotesByFolderQuery = (folderId: string) => {
    return useQuery({
        queryKey: ['notes', folderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notes_with_versions')
                .select('*')
                .eq('folder_id', folderId)
                .order('order_index', { ascending: false })
                .order('created_at', { ascending: true })
            if (error) throw error
            return data as Array<{
                id: string
                folder_id: string
                title: string
                content: string | null
                created_at: string
                updated_at: string
                tags: string[]
                favorite: boolean
                order_index: number | null
                folder_name: string
                version_count: number
                has_multiple_versions: boolean
                current_version_label?: string | null
                current_version_description?: string | null
            }>
        },
        enabled: Boolean(folderId),
    })
}

export const useCreateNoteMutation = (folderId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { title: string; content?: string }) => {
            const { data: userData, error: userErr } = await supabase.auth.getUser()
            if (userErr || !userData.user) throw userErr ?? new Error('Not authenticated')

            // Generate embedding for content if provided
            const embedding = payload.content ? await generateEmbedding(payload.content) : null

            const { data, error } = await supabase
                .from('notes')
                .insert({
                    folder_id: folderId,
                    title: payload.title,
                    content: payload.content || '',
                    user_id: userData.user.id,
                    embedding: embedding
                })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onMutate: async (newNote) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notes', folderId] })
            await queryClient.cancelQueries({ queryKey: ['folders'] })

            // Snapshot the previous values
            const previousNotes = queryClient.getQueryData(['notes', folderId])
            const previousFolders = queryClient.getQueryData(['folders'])

            // Optimistically add the new note
            queryClient.setQueryData(['notes', folderId], (old: unknown) => {
                const notes = old as Array<{
                    id: string
                    folder_id: string
                    title: string
                    content: string | null
                    created_at: string
                    updated_at: string
                    tags: string[]
                    favorite: boolean
                    order_index: number | null
                }> | undefined

                const optimisticNote = {
                    id: `temp-${Date.now()}`,
                    folder_id: folderId,
                    title: newNote.title,
                    content: newNote.content || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    tags: [],
                    favorite: false,
                    order_index: 0,
                }
                return notes ? [optimisticNote, ...notes] : [optimisticNote]
            })

            // Optimistically update folder stats
            queryClient.setQueryData(['folders'], (old: unknown) => {
                const folders = old as Array<{
                    id: string
                    question_count: number
                }> | undefined

                return folders?.map(folder =>
                    folder.id === folderId
                        ? { ...folder, question_count: (folder.question_count || 0) + 1 }
                        : folder
                ) ?? []
            })

            return { previousNotes, previousFolders }
        },
        onError: (err, newNote, context) => {
            // Rollback on error
            if (context?.previousNotes) {
                queryClient.setQueryData(['notes', folderId], context.previousNotes)
            }
            if (context?.previousFolders) {
                queryClient.setQueryData(['folders'], context.previousFolders)
            }
            toast.error('Failed to create note')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', folderId] })
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success('Note created successfully')
        },
    })
}

export const useUpdateNoteMutation = (folderId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { id: string; title?: string; content?: string; tags?: string[]; favorite?: boolean }) => {
            const update: Partial<{ title: string; content: string; tags: string[]; favorite: boolean; embedding: number[] | null }> = {}
            if (payload.title !== undefined) update.title = payload.title
            if (payload.content !== undefined) update.content = payload.content
            if (payload.tags !== undefined) update.tags = payload.tags
            if (payload.favorite !== undefined) update.favorite = payload.favorite

            // Generate new embedding if content is being updated
            if (payload.content !== undefined) {
                const embedding = payload.content ? await generateEmbedding(payload.content) : null
                update.embedding = embedding
            }

            const { error } = await supabase
                .from('notes')
                .update(update)
                .eq('id', payload.id)
            if (error) throw error
        },
        onMutate: async (updatedNote) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notes', folderId] })

            // Snapshot the previous value
            const previousNotes = queryClient.getQueryData(['notes', folderId])

            // Optimistically update to the new value
            queryClient.setQueryData(['notes', folderId], (old: unknown) => {
                const notes = old as Array<{
                    id: string
                    title: string
                    content: string | null
                    tags: string[]
                    favorite: boolean
                    updated_at: string
                }> | undefined

                return notes?.map(note =>
                    note.id === updatedNote.id
                        ? {
                            ...note,
                            ...updatedNote,
                            updated_at: new Date().toISOString()
                        }
                        : note
                ) ?? []
            })

            // Return a context object with the snapshotted value
            return { previousNotes }
        },
        onError: (err, newNote, context) => {
            // Rollback to the previous value on error
            if (context?.previousNotes) {
                queryClient.setQueryData(['notes', folderId], context.previousNotes)
            }
            toast.error('Failed to update note')
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notes', folderId] })
            queryClient.invalidateQueries({ queryKey: ['note', variables.id] })
            
            // If favorite status was updated, also invalidate favorites
            if (variables.favorite !== undefined) {
                queryClient.invalidateQueries({ queryKey: ['favorites'] })
            }
            
            // Only show toast for content/title updates, not for favorite toggles
            if (variables.content !== undefined || variables.title !== undefined) {
                toast.success('Note updated successfully')
            }
        },
    })
}

export const useMoveNoteMutation = (fromFolderId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { id: string; toFolderId: string }) => {
            const { error } = await supabase
                .from('notes')
                .update({ folder_id: payload.toFolderId })
                .eq('id', payload.id)
            if (error) throw error
        },
        onMutate: async (payload) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notes', fromFolderId] })
            await queryClient.cancelQueries({ queryKey: ['notes', payload.toFolderId] })
            await queryClient.cancelQueries({ queryKey: ['folders'] })

            // Snapshot the previous values
            const previousFromNotes = queryClient.getQueryData(['notes', fromFolderId])
            const previousToNotes = queryClient.getQueryData(['notes', payload.toFolderId])
            const previousFolders = queryClient.getQueryData(['folders'])

            // Optimistically move the note
            queryClient.setQueryData(['notes', fromFolderId], (old: unknown) => {
                const notes = old as Array<{ id: string }> | undefined
                return notes?.filter(note => note.id !== payload.id) ?? []
            })

            queryClient.setQueryData(['notes', payload.toFolderId], (old: unknown) => {
                const notes = old as Array<{ id: string; folder_id: string }> | undefined
                const movedNote = (previousFromNotes as Array<{ id: string; folder_id: string }>)?.find((note) => note.id === payload.id)
                if (movedNote) {
                    const updatedNote = { ...movedNote, folder_id: payload.toFolderId }
                    return notes ? [updatedNote, ...notes] : [updatedNote]
                }
                return notes ?? []
            })

            // Optimistically update folder stats
            queryClient.setQueryData(['folders'], (old: unknown) => {
                const folders = old as Array<{ id: string; question_count: number }> | undefined
                return folders?.map(folder => {
                    if (folder.id === fromFolderId) {
                        return { ...folder, question_count: Math.max(0, (folder.question_count || 0) - 1) }
                    }
                    if (folder.id === payload.toFolderId) {
                        return { ...folder, question_count: (folder.question_count || 0) + 1 }
                    }
                    return folder
                }) ?? []
            })

            return { previousFromNotes, previousToNotes, previousFolders }
        },
        onError: (err, payload, context) => {
            // Rollback on error
            if (context?.previousFromNotes) {
                queryClient.setQueryData(['notes', fromFolderId], context.previousFromNotes)
            }
            if (context?.previousToNotes) {
                queryClient.setQueryData(['notes', payload.toFolderId], context.previousToNotes)
            }
            if (context?.previousFolders) {
                queryClient.setQueryData(['folders'], context.previousFolders)
            }
            toast.error('Failed to move note')
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notes', fromFolderId] })
            queryClient.invalidateQueries({ queryKey: ['notes', variables.toFolderId] })
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success('Note moved successfully')
        },
    })
}

export const useBumpNoteMutation = (folderId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { id: string }) => {
            const bump = Math.floor(Date.now() / 1000)
            const { error } = await supabase
                .from('notes')
                .update({ order_index: bump })
                .eq('id', payload.id)
            if (error) throw error
        },
        onMutate: async (payload) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notes', folderId] })

            // Snapshot the previous value
            const previousNotes = queryClient.getQueryData(['notes', folderId])

            // Optimistically bump the note to the top
            const bump = Math.floor(Date.now() / 1000)
            queryClient.setQueryData(['notes', folderId], (old: unknown) => {
                const notes = old as Array<{ id: string; order_index: number }> | undefined
                if (!notes) return []
                const updatedNotes = notes.map(note =>
                    note.id === payload.id ? { ...note, order_index: bump } : note
                )
                // Sort by order_index descending (newest first)
                return updatedNotes.sort((a, b) => (b.order_index || 0) - (a.order_index || 0))
            })

            return { previousNotes }
        },
        onError: (err, payload, context) => {
            // Rollback on error
            if (context?.previousNotes) {
                queryClient.setQueryData(['notes', folderId], context.previousNotes)
            }
            toast.error('Failed to bump note')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', folderId] })
            toast.success('Note bumped to top')
        },
    })
}

export const useReorderFoldersMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { orderedIds: string[] }) => {
            // Update each folder's order_index individually
            const updates = payload.orderedIds.map((id, idx) => 
                supabase
                    .from('folders')
                    .update({ order_index: payload.orderedIds.length - idx })
                    .eq('id', id)
            )
            // Execute all updates in parallel
            const results = await Promise.all(updates)
            const errors = results.filter(r => r.error)
            if (errors.length > 0) throw errors[0].error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success('Folders reordered')
        },
        onError: () => {
            toast.error('Failed to reorder folders')
        },
    })
}

export const useUpdateFolderMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { id: string; name?: string; description?: string; tags?: string[] }) => {
            const update: Partial<{ name: string; description: string; tags: string[] }> = {}
            if (payload.name !== undefined) update.name = payload.name
            if (payload.description !== undefined) update.description = payload.description
            if (payload.tags !== undefined) update.tags = payload.tags

            const { error } = await supabase
                .from('folders')
                .update(update)
                .eq('id', payload.id)
            if (error) throw error
        },
        onError: () => {
            toast.error('Failed to update folder')
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            queryClient.invalidateQueries({ queryKey: ['folder', variables.id] })
            toast.success('Folder updated successfully')
        },
    })
}

export const useArchiveFolderMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { folderId: string; archived: boolean }) => {
            const { error } = await supabase
                .from('folders')
                .update({ archived_at: payload.archived ? new Date().toISOString() : null })
                .eq('id', payload.folderId)
            if (error) throw error
        },
        onError: () => {
            toast.error('Failed to update folder')
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success(variables.archived ? 'Folder archived' : 'Folder restored')
        },
    })
}

export const useReorderNotesMutation = (folderId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { orderedIds: string[] }) => {
            // Update each note's order_index individually
            const updates = payload.orderedIds.map((id, idx) => 
                supabase
                    .from('notes')
                    .update({ order_index: payload.orderedIds.length - idx })
                    .eq('id', id)
            )
            // Execute all updates in parallel
            const results = await Promise.all(updates)
            const errors = results.filter(r => r.error)
            if (errors.length > 0) throw errors[0].error
        },
        onMutate: async (payload) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notes', folderId] })

            // Snapshot the previous value
            const previousNotes = queryClient.getQueryData(['notes', folderId])

            // Optimistically reorder the notes
            queryClient.setQueryData(['notes', folderId], (old: unknown) => {
                const notes = old as Array<{ id: string; order_index: number }> | undefined
                if (!notes) return []

                // Create a map of notes by ID for quick lookup
                const notesMap = new Map(notes.map(note => [note.id, note]))

                // Reorder based on the new order
                return payload.orderedIds.map(id => {
                    const note = notesMap.get(id)
                    if (note) {
                        return { ...note, order_index: payload.orderedIds.length - payload.orderedIds.indexOf(id) }
                    }
                    return null
                }).filter(Boolean)
            })

            return { previousNotes }
        },
        onError: (err, payload, context) => {
            // Rollback on error
            if (context?.previousNotes) {
                queryClient.setQueryData(['notes', folderId], context.previousNotes)
            }
            toast.error('Failed to reorder notes')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', folderId] })
            toast.success('Notes reordered successfully')
        },
    })
}

export const useNoteByIdQuery = (noteId: string) => {
    return useQuery({
        queryKey: ['note', noteId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notes_view')
                .select(`
                    *,
                    folders!inner(name)
                `)
                .eq('id', noteId)
                .single()
            if (error) throw error
            return {
                ...data,
                folder_name: (data.folders as { name: string }).name
            } as {
                id: string
                folder_id: string
                title: string
                content: string | null
                created_at: string
                updated_at: string
                folder_name: string
                tags: string[]
                favorite: boolean
                order_index: number | null
            }
        },
        enabled: Boolean(noteId),
    })
}

export const useSearchNotesByTitleQuery = (query: string) => {
    return useQuery({
        queryKey: ['search-notes-by-title', query],
        queryFn: async () => {
            if (!query.trim()) return []
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) throw new Error("User not found")

            const { data, error } = await supabase
                .from('notes')
                .select(`
                    id,
                    title,
                    folder_id,
                    folders!inner(name)
                `)
                .eq('user_id', userData.user.id)
                .ilike('title', `%${query}%`)
                .limit(10)
                .order('title')

            if (error) throw new Error(error.message)
            return data?.map(item => ({
                id: item.id,
                title: item.title,
                folder_id: item.folder_id,
                folder_name: (item.folders as unknown as { name: string }).name
            })) || []
        },
        enabled: query.trim().length > 0,
        staleTime: 1000 * 60, // Cache for 1 minute
    })
}

export function useBacklinksQuery(noteId: string) {
    return useQuery({
        queryKey: ['backlinks', noteId],
        queryFn: async () => {
            if (!noteId) return [];
            // THE FIX IS HERE: The parameter name must match the function
            const { data, error } = await supabase.rpc('get_backlinks', { note_id_param: noteId });
            if (error) {
                // Add better error logging
                console.error("Backlinks query error:", error);
                throw new Error(error.message);
            }
            return data;
        },
        enabled: !!noteId,
    });
}

// ===================================
// VERSION MANAGEMENT QUERIES & MUTATIONS
// ===================================

// Get all versions for a specific note
export const useNoteVersionsQuery = (noteId: string) => {
    return useQuery({
        queryKey: ['note-versions', noteId],
        queryFn: async (): Promise<NoteVersion[]> => {
            const { data, error } = await supabase.rpc('get_note_versions', { 
                note_id_param: noteId 
            })
            if (error) throw new Error(error.message)
            return data || []
        },
        enabled: !!noteId,
    })
}

// Create a new version from current note content
export const useCreateVersionFromCurrentMutation = (noteId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: {
            versionLabel: string
            versionDescription?: string
            versionType?: 'manual' | 'auto' | 'imported'
            versionTags?: string[]
        }) => {
            const { data, error } = await supabase.rpc('create_version_from_current', {
                note_id_param: noteId,
                version_label_param: input.versionLabel,
                version_description_param: input.versionDescription || null,
                version_type_param: input.versionType || null,
                version_tags_param: input.versionTags || []
            })
            if (error) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            toast.success('Version created successfully')
        },
        onError: () => {
            toast.error('Failed to create version')
        },
    })
}

// Create a version with custom content
export const useCreateVersionMutation = (noteId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: CreateVersionInput) => {
            // Generate embedding for the version content
            const embedding = input.content ? await generateEmbedding(input.content) : null
            
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const { data, error } = await supabase
                .from('note_versions')
                .insert({
                    note_id: input.note_id,
                    content: input.content,
                    version_label: input.version_label,
                    version_description: input.version_description,
                    version_type: input.version_type || null,
                    version_tags: input.version_tags || [],
                    is_current: input.is_current || false,
                    is_default: input.is_default || false,
                    metadata: input.metadata || {},
                    user_id: user.id,
                    embedding: embedding
                })
                .select()
                .single()
            
            if (error) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            toast.success('Version created successfully')
        },
        onError: () => {
            toast.error('Failed to create version')
        },
    })
}

// Update an existing version
export const useUpdateVersionMutation = (noteId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: UpdateVersionInput) => {
            const update: Partial<{
                content: string
                version_label: string
                version_description: string
                version_tags: string[]
                is_current: boolean
                is_default: boolean
                metadata: Record<string, unknown>
                embedding: number[] | null
            }> = {}

            if (input.content !== undefined) {
                update.content = input.content
                // Generate new embedding if content changed
                update.embedding = input.content ? await generateEmbedding(input.content) : null
            }
            if (input.version_label !== undefined) update.version_label = input.version_label
            if (input.version_description !== undefined) update.version_description = input.version_description
            if (input.version_tags !== undefined) update.version_tags = input.version_tags
            if (input.is_current !== undefined) update.is_current = input.is_current
            if (input.is_default !== undefined) update.is_default = input.is_default
            if (input.metadata !== undefined) update.metadata = input.metadata

            const { error } = await supabase
                .from('note_versions')
                .update(update)
                .eq('id', input.id)
                
            if (error) throw new Error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            toast.success('Version updated successfully')
        },
        onError: () => {
            toast.error('Failed to update version')
        },
    })
}

// Switch current version
export const useSwitchCurrentVersionMutation = (noteId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (versionId: string) => {
            const { data, error } = await supabase.rpc('switch_current_version', {
                note_id_param: noteId,
                version_id_param: versionId
            })
            if (error) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            queryClient.invalidateQueries({ queryKey: ['notes'] })
            toast.success('Version switched successfully')
        },
        onError: () => {
            toast.error('Failed to switch version')
        },
    })
}

// Delete a version
export const useDeleteVersionMutation = (noteId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id }: { id: string }) => {
            const { error } = await supabase
                .from('note_versions')
                .delete()
                .eq('id', id)
            
            if (error) throw new Error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            toast.success('Version deleted successfully')
        },
        onError: () => {
            toast.error('Failed to delete version')
        },
    })
}

// Archive/Unarchive a version
export const useArchiveVersionMutation = (noteId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
            const { error } = await supabase
                .from('note_versions')
                .update({ archived_at: archived ? new Date().toISOString() : null })
                .eq('id', id)
            
            if (error) throw new Error(error.message)
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            queryClient.invalidateQueries({ queryKey: ['note', noteId] })
            toast.success(variables.archived ? 'Version archived successfully' : 'Version restored successfully')
        },
        onError: () => {
            toast.error('Failed to archive version')
        },
    })
}


// Enhanced update note mutation with auto-versioning support
export const useUpdateNoteWithVersioningMutation = (folderId: string) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { 
            id: string; 
            title?: string; 
            content?: string; 
            tags?: string[]; 
            favorite?: boolean;
            // Versioning options
            createVersion?: boolean;
            versionLabel?: string;
            versionDescription?: string;
            versionType?: 'manual' | 'auto';
        }) => {
            // If creating a version, save current content as version first
            if (payload.createVersion && payload.content !== undefined) {
                const { data: currentNote } = await supabase
                    .from('notes')
                    .select('content, embedding')
                    .eq('id', payload.id)
                    .single()
                
                if (currentNote?.content && currentNote.content !== payload.content) {
                    await supabase.from('note_versions').insert({
                        note_id: payload.id,
                        content: currentNote.content,
                        version_label: payload.versionLabel || `Version ${new Date().toISOString().split('T')[0]}`,
                        version_description: payload.versionDescription,
                        version_type: payload.versionType || 'manual',
                        is_current: false,
                        is_default: false,
                        embedding: currentNote.embedding
                    })
                }
            }

            // Now update the main note (existing logic)
            const update: Partial<{ 
                title: string; 
                content: string; 
                tags: string[]; 
                favorite: boolean; 
                embedding: number[] | null 
            }> = {}
            
            if (payload.title !== undefined) update.title = payload.title
            if (payload.tags !== undefined) update.tags = payload.tags
            if (payload.favorite !== undefined) update.favorite = payload.favorite
            
            if (payload.content !== undefined) {
                update.content = payload.content
                const embedding = payload.content ? await generateEmbedding(payload.content) : null
                update.embedding = embedding
            }

            const { error } = await supabase
                .from('notes')
                .update(update)
                .eq('id', payload.id)
            if (error) throw error
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notes', folderId] })
            queryClient.invalidateQueries({ queryKey: ['note', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['note-versions', variables.id] })
            
            if (variables.favorite !== undefined) {
                queryClient.invalidateQueries({ queryKey: ['favorites'] })
            }
            
            if (variables.tags !== undefined) {
                queryClient.invalidateQueries({ queryKey: ['tags'] })
            }
        },
        onError: () => {
            toast.error('Failed to update note')
        },
    })
}

// Delete Note Mutation
export function useDeleteNoteMutation(folderId: string) {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (noteId: string) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // First delete all versions of this note
            const { error: versionError } = await supabase
                .from('note_versions')
                .delete()
                .eq('note_id', noteId)
                .eq('user_id', user.id)

            if (versionError) throw new Error(versionError.message)

            // Then delete the note itself
            const { error: noteError } = await supabase
                .from('notes')
                .delete()
                .eq('id', noteId)
                .eq('user_id', user.id)

            if (noteError) throw new Error(noteError.message)

            return noteId
        },
        onSuccess: (noteId) => {
            queryClient.invalidateQueries({ queryKey: ['notes', folderId] })
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] })
            toast.success('Note deleted successfully')
        },
        onError: () => {
            toast.error('Failed to delete note')
        },
    })
}

// Delete Folder Mutation
export function useDeleteFolderMutation() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (folderId: string) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // First, get all notes in this folder
            const { data: folderNotes, error: fetchError } = await supabase
                .from('notes')
                .select('id')
                .eq('folder_id', folderId)
                .eq('user_id', user.id)

            if (fetchError) throw new Error(fetchError.message)

            // Delete all versions for these notes
            if (folderNotes && folderNotes.length > 0) {
                const noteIds = folderNotes.map(note => note.id)
                const { error: versionsError } = await supabase
                    .from('note_versions')
                    .delete()
                    .in('note_id', noteIds)
                    .eq('user_id', user.id)

                if (versionsError) throw new Error(versionsError.message)
            }

            // Then delete all notes in this folder
            const { error: notesError } = await supabase
                .from('notes')
                .delete()
                .eq('folder_id', folderId)
                .eq('user_id', user.id)

            if (notesError) throw new Error(notesError.message)

            // Finally delete the folder itself
            const { error: folderError } = await supabase
                .from('folders')
                .delete()
                .eq('id', folderId)
                .eq('user_id', user.id)

            if (folderError) throw new Error(folderError.message)

            return folderId
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            queryClient.invalidateQueries({ queryKey: ['notes'] })
            toast.success('Folder deleted successfully')
        },
        onError: () => {
            toast.error('Failed to delete folder')
        },
    })
}


