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

  ipcMain.handle('agent:listSkills', async () => {
    return getUtilityClient().listAgentSkills()
  })
}
