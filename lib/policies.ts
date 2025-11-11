const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'

export const PRIVACY_POLICY_METADATA = {
  key: 'privacy',
  title: 'Privacy Policy',
  path: '/privacy-policy',
  lastUpdated: 'November 11, 2025',
}

export const TERMS_OF_SERVICE_METADATA = {
  key: 'terms',
  title: 'Terms of Service',
  path: '/terms-of-service',
  lastUpdated: 'November 11, 2025',
}

export const POLICIES_METADATA = {
  [PRIVACY_POLICY_METADATA.key]: PRIVACY_POLICY_METADATA,
  [TERMS_OF_SERVICE_METADATA.key]: TERMS_OF_SERVICE_METADATA,
}

export type PolicyKey = keyof typeof POLICIES_METADATA

export function getPolicyUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  return `${baseUrl}${path}`
}
