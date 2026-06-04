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

export interface ProjectData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  viewport: ProjectViewport
  nodes: unknown[]
  edges: unknown[]
  groups: unknown[]
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
}
