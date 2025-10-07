import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Folder = {
  id: string
  name: string
  description: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  question_count: number
  answered_count: number
  parent_folder_id?: string | null
}

export type FolderWithChildren = Folder & { children: FolderWithChildren[] }

