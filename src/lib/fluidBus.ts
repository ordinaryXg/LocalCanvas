export type FluidBusEvent =
  | { type: 'resonance:patched'; projectId: string }
  | { type: 'breath:phase'; phase: string }
  | { type: 'superposed:appended'; shotSlotId: string }
  | { type: 'affect:patched'; projectId: string }
  | { type: 'probe:ready'; previewId: string }

type Listener = (event: FluidBusEvent) => void

const listeners = new Set<Listener>()

export const fluidBus = {
  emit(event: FluidBusEvent) {
    listeners.forEach((l) => l(event))
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
