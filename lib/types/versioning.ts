// Types for the note versioning system

export interface NoteVersion {
  id: string
  note_id: string
  content: string
  version_label?: string
  version_description?: string
  version_type?: 'manual' | 'auto' | 'imported'
  is_current: boolean
  is_default: boolean
  version_tags: string[]
  metadata: Record<string, unknown>
  user_id: string
  created_at: string
  updated_at: string
  content_length?: number
  has_embedding?: boolean
}

export interface VersionRelationship {
  id: string
  parent_version_id: string
  child_version_id: string
  relationship_type: 'derived_from' | 'merged_with' | 'branched_from'
  user_id: string
  created_at: string
}

export interface CreateVersionInput {
  note_id: string
  content: string
  version_label?: string
  version_description?: string
  version_type?: 'manual' | 'auto' | 'imported'
  version_tags?: string[]
  is_current?: boolean
  is_default?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateVersionInput {
  id: string
  content?: string
  version_label?: string
  version_description?: string
  version_tags?: string[]
  is_current?: boolean
  is_default?: boolean
  metadata?: Record<string, unknown>
}

export interface VersionSearchResult {
  note_id: string
  folder_id: string
  title: string
  content: string
  version_id?: string
  version_label?: string
  is_current_version: boolean
  rank: number
  snippet_title: string
  snippet_content: string
  created_at: string
  updated_at: string
}

export interface VersionSemanticResult {
  note_id: string
  title: string
  content: string
  version_id?: string
  version_label?: string
  is_current_version: boolean
  similarity: number
  folder_id: string
}

export interface NoteWithVersions {
  id: string
  folder_id: string
  title: string
  content?: string
  tags: string[]
  favorite: boolean
  order_index: number
  user_id: string
  created_at: string
  updated_at: string
  folder_name?: string
  version_count: number
  has_multiple_versions: boolean
  current_version_label?: string
  current_version_description?: string
}

export interface VersionStats {
  total_notes: number
  notes_with_versions: number
  total_versions: number
  avg_versions_per_note: number
  most_versioned_note_id?: string
  most_versioned_note_title?: string
  max_versions: number
}

export interface VersioningSettings {
  autoVersioning: {
    enabled: boolean
    threshold: 'conservative' | 'moderate' | 'aggressive'
    notifications: boolean
  }
  display: {
    showVersionCount: boolean
    defaultVersionView: 'current' | 'latest' | 'default'
    versionBadges: boolean
  }
  cleanup: {
    autoCleanup: boolean
    maxVersionsPerNote: number
    cleanupAfterDays: number
  }
}

export interface AutoVersioningOptions {
  enabled: boolean
  threshold: number // 0.0 to 1.0 - percentage of content that needs to change
  minWordCount: number // minimum words before auto-versioning kicks in
  cooldownMinutes: number // minimum time between auto-versions
}

// Helper types for version operations
export type VersionAction = 
  | { type: 'create'; data: CreateVersionInput }
  | { type: 'update'; data: UpdateVersionInput }
  | { type: 'switch'; noteId: string; versionId: string }
  | { type: 'delete'; versionId: string }
  | { type: 'restore'; versionId: string }

export interface VersionComparisonData {
  leftVersion: NoteVersion
  rightVersion: NoteVersion
  diff: {
    added: string[]
    removed: string[]
    changed: { from: string; to: string }[]
  }
  similarity: number
  wordCountDiff: number
}