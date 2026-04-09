export function generateDotEmail(baseEmail: string, index: number): string {
  const [username, domain] = baseEmail.split('@')

  if (index <= 0 || index >= username.length) {
    throw new Error('Index must be between 1 and ' + (username.length - 1))
  }

  return username.slice(0, index) + '.' + username.slice(index) + '@' + domain
}
