import { ipcMain } from 'electron'
import { getUtilityClient } from '../services/utility-client'
import { agentSessionRepository } from '../repositories/agent-session-repository'
import { getActiveProjectId } from '../services/generation-tracker'
import { logger } from '../services/logger'
import type { AgentMessage } from '../../../src/types/agent'

export function registerAgentIpc(): void {
  ipcMain.handle(
    'agent:chat',
    async (
      _e,
      payload: {
        message: string
        sessionId?: string
        disabledSkills?: string[]
        freePlan?: boolean
        defaultTrack?: 'auto' | 'lite' | 'studio'
      },
    ) => {
      try {
        let sessionId = payload.sessionId
        if (!sessionId) {
          sessionId = agentSessionRepository.create(getActiveProjectId() ?? undefined, payload.message.slice(0, 40))
        }

        const userMsg: AgentMessage = {
          role: 'user',
          content: payload.message,
          timestamp: new Date().toISOString(),
        }
        agentSessionRepository.appendMessage(sessionId, userMsg)

        const result = await getUtilityClient().agentChat({
          message: payload.message,
          disabledSkills: payload.disabledSkills,
          freePlan: payload.freePlan,
          defaultTrack: payload.defaultTrack,
        })

        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: result.reply,
          plan: result.plan,
          productionPlan: result.productionPlan,
          planWarnings: result.planWarnings,
          timestamp: new Date().toISOString(),
        }
        agentSessionRepository.appendMessage(
          sessionId,
          assistantMsg,
          result.plan,
          result.productionPlan,
        )

        return { ...result, sessionId }
      } catch (error) {
        logger.error('agent:chat failed', error)
        const message = error instanceof Error ? error.message : String(error)
        return { reply: '', sessionId: payload.sessionId ?? '', error: 'AGENT_FAILED', message }
      }
    },
  )

  ipcMain.handle('agent:listSessions', (_e, projectId?: string) => {
    return agentSessionRepository.list(projectId).map((s) => ({
      id: s.id,
      title: s.title,
      projectId: s.projectId,
      lastPlan: s.lastPlan,
      lastProductionPlan: s.lastProductionPlan,
      updatedAt: s.updatedAt,
    }))
  })

  ipcMain.handle('agent:getSession', (_e, sessionId: string) => {
    const session = agentSessionRepository.findById(sessionId)
    if (!session) return null
    return {
      id: session.id,
      title: session.title,
      projectId: session.projectId,
      messages: session.messages,
      lastPlan: session.lastPlan,
      lastProductionPlan: session.lastProductionPlan,
      updatedAt: session.updatedAt,
    }
  })

  ipcMain.handle('agent:listSkills', async () => {
    return getUtilityClient().listAgentSkills()
  })

  ipcMain.handle(
    'agent:buildPatch',
    async (
      _e,
      payload: {
        message: string
        sessionId?: string
        focusedNodeIds: string[]
        canvasNodes: Array<{
          id: string
          type: string
          label?: string
          data: Record<string, unknown>
        }>
        canvasEdges: Array<{
          id: string
          source: string
          target: string
          sourceHandle?: string | null
          targetHandle?: string | null
        }>
      },
    ) => {
      try {
        let sessionId = payload.sessionId
        if (!sessionId) {
          sessionId = agentSessionRepository.create(
            getActiveProjectId() ?? undefined,
            payload.message.slice(0, 40),
          )
          const userMsg: AgentMessage = {
            role: 'user',
            content: payload.message,
            timestamp: new Date().toISOString(),
          }
          agentSessionRepository.appendMessage(sessionId, userMsg)
        }

        const result = await getUtilityClient().agentBuildPatch({
          message: payload.message,
          focusedNodeIds: payload.focusedNodeIds,
          canvasNodes: payload.canvasNodes,
          canvasEdges: payload.canvasEdges,
        })

        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: result.reply,
          timestamp: new Date().toISOString(),
        }
        agentSessionRepository.appendMessage(sessionId, assistantMsg)

        return { ...result, sessionId }
      } catch (error) {
        logger.error('agent:buildPatch failed', error)
        const message = error instanceof Error ? error.message : String(error)
        return { reply: '', sessionId: payload.sessionId ?? '', error: 'AGENT_FAILED', message }
      }
    },
  )

  ipcMain.handle(
    'agent:buildFromTemplate',
    async (
      _e,
      payload: {
        skillId: string
        intent: string
        sessionId?: string
        disabledSkills?: string[]
        defaultTrack?: 'auto' | 'lite' | 'studio'
        brief?: {
          title?: string
          filmType?: string
          targetDurationSec?: number
          aspectRatio?: string
          tone?: string
          mustInclude?: string
        }
        creativeBible?: Array<{
          id: string
          kind: string
          name: string
          visualDescription: string
        }>
        takesPerShot?: number
      },
    ) => {
      try {
        let sessionId = payload.sessionId
        if (!sessionId) {
          sessionId = agentSessionRepository.create(
            getActiveProjectId() ?? undefined,
            payload.intent.slice(0, 40),
          )
          const userMsg: AgentMessage = {
            role: 'user',
            content: payload.intent,
            timestamp: new Date().toISOString(),
          }
          agentSessionRepository.appendMessage(sessionId, userMsg)
        }

        const result = await getUtilityClient().agentBuildFromTemplate({
          skillId: payload.skillId,
          intent: payload.intent,
          disabledSkills: payload.disabledSkills,
          defaultTrack: payload.defaultTrack,
          brief: payload.brief,
          creativeBible: payload.creativeBible,
          takesPerShot: payload.takesPerShot,
        })

        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: result.reply,
          plan: result.plan as AgentMessage['plan'],
          productionPlan: result.productionPlan,
          planWarnings: result.planWarnings,
          timestamp: new Date().toISOString(),
        }
        agentSessionRepository.appendMessage(
          sessionId,
          assistantMsg,
          result.plan as AgentMessage['plan'],
          result.productionPlan,
        )

        return { ...result, sessionId }
      } catch (error) {
        logger.error('agent:buildFromTemplate failed', error)
        const message = error instanceof Error ? error.message : String(error)
        return { reply: '', sessionId: payload.sessionId ?? '', error: 'AGENT_FAILED', message }
      }
    },
  )

  ipcMain.handle(
    'agent:expandShots',
    async (
      _e,
      payload: {
        productionPlan: import('../../../src/types/agent').ProductionPlan
        anchorNodeIds: string[]
        maxShots?: number
        referenceImageNodeId?: string
      },
    ) => {
      try {
        return await getUtilityClient().agentExpandShots(payload)
      } catch (error) {
        logger.error('agent:expandShots failed', error)
        const message = error instanceof Error ? error.message : String(error)
        return { reply: '', sessionId: '', error: 'AGENT_FAILED', message }
      }
    },
  )
}
