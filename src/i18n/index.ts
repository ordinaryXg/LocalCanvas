import zhCN from './zh-CN.json' with { type: 'json' }
import enUS from './en-US.json' with { type: 'json' }
import { create } from 'zustand'

export type Locale = 'zh-CN' | 'en-US'

const dictionaries: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

function readStoredLocale(): Locale {
  try {
    if (typeof localStorage === 'undefined') return 'zh-CN'
    return (localStorage.getItem('lc-locale') as Locale) || 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: readStoredLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem('lc-locale', locale)
    } catch {
      /* Node / 无 storage 环境 */
    }
    set({ locale })
    if (typeof window !== 'undefined' && window.api?.app?.setLocale) {
      void window.api.app.setLocale(locale)
    }
  },
}))

export function t(key: string, locale?: Locale): string {
  const loc = locale ?? useI18nStore.getState().locale
  return dictionaries[loc][key] ?? dictionaries['zh-CN'][key] ?? key
}

export function useT(): (key: string) => string {
  const locale = useI18nStore((s) => s.locale)
  return (key: string) => t(key, locale)
}
