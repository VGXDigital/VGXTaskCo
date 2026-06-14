// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? ''
// Anon key is used only for constructing OAuth URLs — no auth SDK needed
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? ''

export function getSSOUrl(provider: 'google' | 'github', redirectTo: string): string {
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    flow_type: 'implicit',
  })
  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`
}
