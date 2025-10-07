import { z } from 'zod'

export const createFolderSchema = z.object({
    name: z.string().min(1, 'Folder name is required').max(100),
    description: z.string().max(500).optional(),
    tags: z.array(z.string()).default([]),
})

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
})

export const quickAddSchema = z.object({
    question: z.string().min(1, 'Question is required').max(1000),
    answer: z.string().min(1, 'Answer is required'),
    folderId: z.string().optional(),
})


