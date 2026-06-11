export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  hasThumbnail?: boolean
}

export interface ProjectViewport {
  x: number
  y: number
  zoom: number
}

export interface ProjectGroup {
  id: string
  label: string
  position: { x: number; y: number }
  width: number
  height: number
}

export type CreativeBibleEntryKind = 'character' | 'product' | 'location'

export interface CreativeBibleEntry {
  id: string
  kind: CreativeBibleEntryKind
  name: string
  visualDescription: string
  referenceImageHint?: string
  lockedPromptPrefix?: string
}

export interface ProjectMetadata {
  version: 1
  creativeBible?: CreativeBibleEntry[]
}

export interface ProjectData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  viewport: ProjectViewport
  nodes: unknown[]
  edges: unknown[]
  groups: unknown[]
  metadata?: ProjectMetadata
}

export interface ProjectSavePayload {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
  viewport: ProjectViewport
  nodes: unknown[]
  edges: unknown[]
  groups: unknown[]
  metadata?: ProjectMetadata
}
