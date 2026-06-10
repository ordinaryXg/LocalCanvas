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
        })

        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: result.reply,
          plan: result.plan,
          timestamp: new Date().toISOString(),
        }
        agentSessionRepository.appendMessage(sessionId, assistantMsg, result.plan)

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
        })

        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: result.reply,
          plan: result.plan as AgentMessage['plan'],
          timestamp: new Date().toISOString(),
        }
        agentSessionRepository.appendMessage(sessionId, assistantMsg, result.plan as AgentMessage['plan'])

        return { ...result, sessionId }
      } catch (error) {
        logger.error('agent:buildFromTemplate failed', error)
        const message = error instanceof Error ? error.message : String(error)
        return { reply: '', sessionId: payload.sessionId ?? '', error: 'AGENT_FAILED', message }
      }
    },
  )
}
