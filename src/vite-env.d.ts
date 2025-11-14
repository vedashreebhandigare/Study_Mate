/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLASK_URL: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_YOUTUBE_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
