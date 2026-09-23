import type { PromptDockApi } from '@shared/types'

declare global {
  interface Window {
    promptDock: PromptDockApi
  }
}

export {}
