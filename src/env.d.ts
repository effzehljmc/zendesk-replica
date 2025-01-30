/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LANGFUSE_API_KEY: string
  readonly VITE_LANGFUSE_PUBLIC_KEY: string
  readonly VITE_LANGFUSE_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 