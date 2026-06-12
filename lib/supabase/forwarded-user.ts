import type { User } from '@supabase/supabase-js'

export type AuthUserMetadata = {
  full_name?: string
  name?: string
  display_name?: string
}

export type AuthUser = {
  id: string
  email: string | null
  user_metadata: AuthUserMetadata
}

const USER_ID_HEADER = 'x-pickems-user-id'
const USER_EMAIL_HEADER = 'x-pickems-user-email'
const USER_FULL_NAME_HEADER = 'x-pickems-user-full-name'
const USER_NAME_HEADER = 'x-pickems-user-name'
const USER_DISPLAY_NAME_HEADER = 'x-pickems-user-display-name'

function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value)
}

function decodeHeaderValue(value: string | null): string | undefined {
  if (!value) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

function setOptionalHeader(headers: Headers, name: string, value: string | null | undefined): void {
  if (value) {
    headers.set(name, encodeHeaderValue(value))
    return
  }

  headers.delete(name)
}

export function toAuthUser(user: Pick<User, 'id' | 'email' | 'user_metadata'>): AuthUser {
  const metadata = user.user_metadata ?? {}

  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof metadata.full_name === 'string' ? metadata.full_name : undefined,
      name: typeof metadata.name === 'string' ? metadata.name : undefined,
      display_name: typeof metadata.display_name === 'string' ? metadata.display_name : undefined,
    },
  }
}

export function clearForwardedUserHeaders(headers: Headers): void {
  headers.delete(USER_ID_HEADER)
  headers.delete(USER_EMAIL_HEADER)
  headers.delete(USER_FULL_NAME_HEADER)
  headers.delete(USER_NAME_HEADER)
  headers.delete(USER_DISPLAY_NAME_HEADER)
}

export function writeForwardedUserHeaders(headers: Headers, user: AuthUser | null): void {
  clearForwardedUserHeaders(headers)

  if (!user) return

  headers.set(USER_ID_HEADER, user.id)
  setOptionalHeader(headers, USER_EMAIL_HEADER, user.email)
  setOptionalHeader(headers, USER_FULL_NAME_HEADER, user.user_metadata.full_name)
  setOptionalHeader(headers, USER_NAME_HEADER, user.user_metadata.name)
  setOptionalHeader(headers, USER_DISPLAY_NAME_HEADER, user.user_metadata.display_name)
}

export function readForwardedUserHeaders(headers: Pick<Headers, 'get'>): AuthUser | null {
  const id = headers.get(USER_ID_HEADER)

  if (!id) return null

  return {
    id,
    email: decodeHeaderValue(headers.get(USER_EMAIL_HEADER)) ?? null,
    user_metadata: {
      full_name: decodeHeaderValue(headers.get(USER_FULL_NAME_HEADER)),
      name: decodeHeaderValue(headers.get(USER_NAME_HEADER)),
      display_name: decodeHeaderValue(headers.get(USER_DISPLAY_NAME_HEADER)),
    },
  }
}