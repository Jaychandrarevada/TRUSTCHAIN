/// <reference types="vite/client" />

/** Typed environment variables (see .env.example). */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_VERIFY_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
