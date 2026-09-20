import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUp, CalendarDays, Check, Copy, ExternalLink, FileText, Mic, Plus, Sparkles, Square } from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { VoiceBeam } from 'voice-glow'

import { studentService } from '../services/mockService'
import type { AssistantSource } from '../services/localAssistant'
import type { EventItem, Payment } from '../data'
import { PageIntro } from '../components/UI'
import './AskAI.css'

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  )}</>
}

function ReadableAnswer({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const blocks: { type: 'heading' | 'paragraph' | 'list'; lines: string[] }[] = []
  for (const line of lines) {
    const value = line.trim()
    if (!value) continue
    const isHeading = /^#{1,3}\s+/.test(value)
    const isList = /^(?:[-*•]\s*|\d+[.)]\s+)/.test(value)
    const type = isHeading ? 'heading' : isList ? 'list' : 'paragraph'
    const cleaned = isHeading ? value.replace(/^#{1,3}\s+/, '')
      : isList ? value.replace(/^(?:[-*•]\s*|\d+[.)]\s+)/, '') : value
    const last = blocks[blocks.length - 1]
    if (last?.type === type && type !== 'heading') last.lines.push(cleaned)
    else blocks.push({ type, lines: [cleaned] })
  }
  return <div className="chat-readable">
    {blocks.map((block, index) => block.type === 'heading'
      ? <h3 key={index}><InlineText text={block.lines[0]} /></h3>
      : block.type === 'list'
        ? <ul key={index}>{block.lines.map((line, itemIndex) => <li key={itemIndex}><InlineText text={line} /></li>)}</ul>
        : <p key={index}>{block.lines.map((line, itemIndex) => <span key={itemIndex}><InlineText text={line} />{itemIndex < block.lines.length - 1 && <br />}</span>)}</p>
    )}
  </div>
}

type VoiceRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  start: () => void
  stop: () => void
}
const quickPrompts = [
  { label: 'Find my exam documents', icon: FileText },
  { label: 'Summarize the latest email', icon: Sparkles },
  { label: 'What deadlines are coming up?', icon: CalendarDays },
]

export default function AskAI({ payments, events, updateCalendar, theme }: {
  payments: Payment[]
  events: EventItem[]
  updateCalendar: (event: EventItem, state: EventItem['calendarState']) => Promise<void>
  theme: 'light' | 'dark'
}) {
  const [messages, setMessages] = useState<
    {
      role: 'user' | 'assistant'
      text: string
      sources?: AssistantSource[]
      actions?: { type: 'add_to_calendar'; eventId: string }[]
      mode?: 'ai' | 'search'
    }[]
  >([])

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(true)
  const [voiceHint, setVoiceHint] = useState('')
  const [voiceFinal, setVoiceFinal] = useState('')
  const [voiceInterim, setVoiceInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceCaptured, setVoiceCaptured] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [motionAllowed, setMotionAllowed] = useState(() =>
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const bottom = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const voiceBaseRef = useRef('')
  const voiceLevelRef = useRef(0)
  const noSpeechTimerRef = useRef<number | null>(null)

  const stopDictation = () => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (noSpeechTimerRef.current !== null) window.clearTimeout(noSpeechTimerRef.current)
    noSpeechTimerRef.current = null
    try { recognition?.stop() } catch { /* Recognition may have ended already. */ }
    voiceLevelRef.current = 0
    setListening(false)
  }

  useEffect(() => () => {
    if (noSpeechTimerRef.current !== null) window.clearTimeout(noSpeechTimerRef.current)
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  useEffect(() => {
    if (!messages.length && !busy) return
    bottom.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [messages, busy])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = (event: MediaQueryListEvent | MediaQueryList) => setMotionAllowed(!event.matches)
    updateMotion(media)
    media.addEventListener('change', updateMotion)
    return () => media.removeEventListener('change', updateMotion)
  }, [])

  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    if (listening) stopDictation()

    setMessages(previous => [
      ...previous,
      {
        role: 'user',
        text: question.trim(),
      },
    ])

    setInput('')
    setShowQuickPrompts(false)
    setVoiceHint('')
    setBusy(true)

    try {
      const result = await studentService.askAI(question.trim(), payments)
      setMessages(previous => [...previous, {
        role: 'assistant',
        text: result.answer,
        sources: result.sources,
        actions: result.actions,
        mode: result.mode,
      }])
    } catch (error) {
      setMessages(previous => [...previous, {
        role: 'assistant',
        text: error instanceof Error ? error.message : 'I could not load your college records. Please try again.',
      }])
    } finally {
      setBusy(false)
      setVoiceCaptured(false)
    }
  }

  const startDictation = () => {
    if (listening) {
      stopDictation()
      return
    }
    const browser = window as typeof window & {
      SpeechRecognition?: new () => VoiceRecognition
      webkitSpeechRecognition?: new () => VoiceRecognition
    }
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceHint(window.isSecureContext
        ? 'This browser does not support live speech-to-text. Try Chrome or Edge.'
        : 'Microphone input needs HTTPS or localhost. A phone opened through a local HTTP address cannot use it.')
      return
    }
    setVoiceHint('')
    voiceBaseRef.current = input.trim()
    setVoiceFinal('')
    setVoiceInterim('')
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    let hasResult = false
    recognition.onstart = () => {
      voiceLevelRef.current = 0.12
      noSpeechTimerRef.current = window.setTimeout(() => {
        if (recognitionRef.current === recognition && !hasResult) {
          setVoiceHint('No words yet. Check this site’s microphone permission and speak again.')
        }
      }, 7000)
    }
    recognition.onspeechstart = () => { voiceLevelRef.current = 0.75 }
    recognition.onspeechend = () => { voiceLevelRef.current = 0.12 }
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return
      const final: string[] = []
      const interim: string[] = []
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index]
        const text = result[0]?.transcript.trim()
        if (text) (result.isFinal ? final : interim).push(text)
      }
      const confirmed = final.join(' ').trim()
      const inProgress = interim.join(' ').trim()
      setVoiceFinal(confirmed)
      setVoiceInterim(inProgress)
      const spoken = [confirmed, inProgress].filter(Boolean).join(' ').trim()
      setInput([voiceBaseRef.current, spoken].filter(Boolean).join(' ').slice(0, 600))
      setVoiceCaptured(Boolean(spoken))
      voiceLevelRef.current = 0.7
      if (spoken) {
        hasResult = true
        setVoiceHint('')
        if (noSpeechTimerRef.current !== null) window.clearTimeout(noSpeechTimerRef.current)
        noSpeechTimerRef.current = null
      }
    }
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition) return
      const reason = event.error
      setVoiceHint(reason === 'not-allowed' || reason === 'service-not-allowed'
        ? 'Microphone access was blocked. Allow it in your browser’s site settings, then tap the mic again.'
        : reason === 'network'
          ? 'Speech recognition needs a network connection in this browser. Check your connection and try again.'
          : reason === 'no-speech'
            ? 'No speech was heard. Tap the mic and try again.'
            : 'Speech recognition stopped. Your words so far are still in the input box.')
      stopDictation()
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      if (!hasResult) setVoiceHint('No words were captured. Check this site’s microphone permission, then try again.')
      stopDictation()
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      setVoiceHint('Voice recognition could not start. You can type your question instead.')
      stopDictation()
    }
  }

  return (
    <div className={`ask-ai-page ${messages.length ? 'has-conversation' : 'is-welcome'}`}>
      <PageIntro
        title="Ask AI"
        copy="Ask about saved notices and events, and approve suggested calendar actions."
      />

      <div className="chat-layout">
        <section className="chat-panel">
          <div className="chat-header">
            <span className="chat-ai-icon">
              <Sparkles size={20} />
            </span>

            <div>
              <strong>Herald Assistant</strong>
              <small>Answers from your saved college records</small>
            </div>

            <span className="chat-mode">Gemini + saved search</span>
          </div>

          <div className="chat-messages">
            {!messages.length && !busy && <div className="chat-welcome">
              <Sparkles className="chat-welcome-mark" size={50} fill="currentColor" strokeWidth={1.3} />
              <h2>Hi Aashish, What’s on<br />your mind?</h2>
            </div>}
            {messages.map((message, index) => (
              <div
                className={`chat-message ${message.role}`}
                key={index}
              >
                {message.role === 'assistant' && (
                  <span className="chat-bot-avatar">
                    <Sparkles size={16} />
                  </span>
                )}

                <div className="chat-answer">
                  {message.role === 'assistant' ? <ReadableAnswer text={message.text} /> : <p>{message.text}</p>}
                  {message.mode === 'search' && <small className="chat-answer-mode">Saved-record search</small>}
                  {!!message.sources?.length && (
                    <details className="chat-source-panel">
                      <summary>Sources <span>{message.sources.length}</span></summary>
                      <div className="chat-sources">
                        {message.sources.map(source => <div className="chat-source-card" key={source.id}>
                          <span className="chat-source-kind">{source.kind}</span>
                          <strong>{source.title}</strong>
                          <div className="chat-source-links">
                            {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">Open original <ExternalLink size={12} /></a>}
                            <button onClick={() => void ask(`Tell me more about ${source.title}`)} disabled={busy}>Ask about this <ArrowRight size={12} /></button>
                          </div>
                        </div>)}
                      </div>
                    </details>
                  )}
                  {!!message.actions?.length && <div className="chat-actions">
                    {message.actions.map(action => {
                      const event = events.find(item => item.id === action.eventId)
                      if (!event) return null
                      return <button key={action.eventId} disabled={event.calendarState !== 'Pending'}
                        onClick={() => void updateCalendar(event, 'Added')}>
                        {event.calendarState === 'Pending' ? `Add ${event.title} to Calendar` : 'Calendar approved'}
                      </button>
                    })}
                  </div>}
                  {message.role === 'assistant' && index > 0 && <button className="chat-copy" onClick={async () => {
                    await navigator.clipboard.writeText(message.text)
                    setCopiedIndex(index)
                  }} aria-label="Copy answer">
                    {copiedIndex === index ? <Check size={13} /> : <Copy size={13} />}
                    {copiedIndex === index ? 'Copied' : 'Copy answer'}
                  </button>}
                </div>
              </div>
            ))}

            {busy && (
              <div className="chat-message assistant">
                <span className="chat-bot-avatar">
                  <Sparkles size={16} />
                </span>

                <p>Thinking...</p>
              </div>
            )}

            <div ref={bottom} />
          </div>

          {showQuickPrompts && <div className="chat-mobile-prompts" aria-label="Suggested questions">
            {quickPrompts.map(({ label, icon: Icon }) => <button type="button" key={label} onClick={() => void ask(label)} disabled={busy}><Icon size={13} fill={label === 'Find my exam documents' ? 'currentColor' : 'none'} />{label}</button>)}
          </div>}
          <VoiceBeam
            className={`chat-voice-beam${listening ? ' is-dictating' : ''}`}
            type="default"
            level={() => voiceLevelRef.current}
            processing={busy && voiceCaptured}
            colorVariant="colorful"
            theme={theme}
            strength={0.8}
            borderRadius={listening ? 28 : 999}
            active={motionAllowed && (listening || (busy && voiceCaptured))}
          >
          <BorderBeam
            className={`chat-composer-beam${listening ? ' is-dictating' : ''}`}
            size="line"
            colorVariant="ocean"
            strength={0.35}
            borderRadius={listening ? 28 : 999}
            active={motionAllowed && !!input.trim() && !listening}
            theme={theme}
          >
          <form
            className={`chat-composer${listening ? ' is-dictating' : ''}`}
            onSubmit={e => {
              e.preventDefault()
              void ask(input)
            }}
          >
            <button className="chat-composer-plus" type="button" onClick={() => setShowQuickPrompts(value => !value)} aria-label={showQuickPrompts ? 'Hide suggested questions' : 'Show suggested questions'}><Plus size={23} /></button>
            {listening ? <div className="chat-live-transcript" role="status" aria-live="polite" aria-atomic="true">
              {voiceBaseRef.current && <span>{voiceBaseRef.current} </span>}
              <span>{voiceFinal}</span>{voiceFinal && voiceInterim ? ' ' : ''}
              <span className="chat-live-interim">{voiceInterim}</span>
              {!voiceFinal && !voiceInterim && <span className="chat-live-placeholder">{voiceHint || 'Listening… speak now'}</span>}
            </div> : <input
              placeholder="Ask UniSync"
              aria-label="Question about saved college records"
              maxLength={600}
              value={input}
              onChange={e => setInput(e.target.value)}
            />}
            <button className={`chat-composer-mic${listening ? ' is-listening' : ''}`} type="button" onClick={startDictation}
              aria-label={listening ? 'Stop recording' : 'Start voice input'} aria-pressed={listening}>
              {listening ? <Square size={17} fill="currentColor" /> : <Mic size={20} />}
            </button>
            <button
              className="chat-send"
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Ask Herald Assistant"
            >
              <ArrowUp size={22} />
            </button>
          </form>
          </BorderBeam>
          </VoiceBeam>
          {voiceHint && <p className="chat-voice-hint" role="status">{voiceHint}</p>}
          <p className="chat-disclaimer">Relevant notice, event, and extracted file text goes to Gemini through your n8n workflow. Your own fee-status marks stay local. Unread files still need to be opened manually.</p>
        </section>
        <aside className="chat-suggestions">
          <h2>Try asking</h2>
          {['What deadlines are coming up?', 'Show recent notices', 'Which fees have I marked paid?', 'Find my exam documents'].map(prompt => (
            <button key={prompt} onClick={() => void ask(prompt)} disabled={busy}>
              {prompt} <ArrowRight size={15} />
            </button>
          ))}
        </aside>
      </div>
    </div>
  )
}
