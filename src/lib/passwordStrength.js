// Live hint under the signup password field. Deliberately simple and
// deliberately NOT a gate — the only hard rule is the 8-char minimum the
// server enforces. Tones map to text colors in SignInSheet.

export function passwordStrength(pw) {
  if (pw.length < 8) return { label: 'too short', tone: 'dim' }
  let classes = 0
  if (/[a-z]/.test(pw)) classes++
  if (/[A-Z]/.test(pw)) classes++
  if (/[0-9]/.test(pw)) classes++
  if (/[^a-zA-Z0-9]/.test(pw)) classes++
  if (classes < 2) return { label: 'weak', tone: 'warn' }
  if (pw.length >= 12) return { label: 'strong', tone: 'good' }
  return { label: 'okay', tone: 'okay' }
}
