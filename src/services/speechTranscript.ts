type SpeechResult = {
  isFinal: boolean
  [index: number]: { transcript: string }
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean)
const comparable = (word: string) => word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function overlapLength(previous: string[], next: string[]) {
  for (let length = Math.min(previous.length, next.length); length > 0; length--) {
    if (previous.slice(-length).every((word, index) => comparable(word) === comparable(next[index]))) {
      return length
    }
  }
  return 0
}

export function readSpeechTranscript(results: ArrayLike<SpeechResult>) {
  let confirmed: string[] = []
  let latestInterim: string[] = []

  for (let index = 0; index < results.length; index++) {
    const result = results[index]
    const segment = words(result[0]?.transcript ?? '')
    if (!segment.length) continue

    if (!result.isFinal) {
      // Interim entries are revised hypotheses, not extra spoken phrases.
      latestInterim = segment
      continue
    }

    const overlap = overlapLength(confirmed, segment)
    // Two separate one-word final results can be an intentional repetition.
    const repeatedWord = confirmed.length === 1 && segment.length === 1
    confirmed = confirmed.concat(segment.slice(repeatedWord ? 0 : overlap))
  }

  const overlap = overlapLength(confirmed, latestInterim)
  // An older interim hypothesis can be wholly contained in a newer final result.
  const covered = latestInterim.length <= confirmed.length && latestInterim.every(
    (word, index) => comparable(word) === comparable(confirmed[index]),
  )
  return {
    final: confirmed.join(' '),
    interim: (covered ? [] : latestInterim.slice(overlap)).join(' '),
  }
}
