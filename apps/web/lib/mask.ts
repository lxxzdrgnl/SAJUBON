/** 이메일 로컬파트를 마스킹한다. `coop.plz.plz@gmail.com` → `coo***@gmail.com` */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at) // '@' 포함
  if (local.length <= 3) return `${local[0] ?? ''}***${domain}`
  return `${local.slice(0, 3)}***${domain}`
}
