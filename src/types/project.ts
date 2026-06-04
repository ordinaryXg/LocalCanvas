export interface ProjectSummary {
  id: string
  name: string
  updatedAt: string
}

export interface ProjectViewport {
  x: number
  y: number
  zoom: number
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
