export function emailDraft(subject: string, lines: string[]) {
  const body = lines.join('\n').replace(/\r\n|\r|\n/g, '\r\n')
  return `mailto:blueshells.team@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function openEmailDraft(link: string) {
  try {
    window.location.assign(link)
  } catch {
    // The receipt includes a link for browsers that require a fresh user gesture.
  }
}
