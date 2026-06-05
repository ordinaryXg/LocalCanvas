export const FLUID_UI = import.meta.env.VITE_FLUID_UI === '1'
export const FLUID_RESONANCE = import.meta.env.VITE_FLUID_RESONANCE === '1' || FLUID_UI
export const FLUID_PROBE = import.meta.env.VITE_FLUID_PROBE === '1' || FLUID_UI
