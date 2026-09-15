import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, ExternalLink, Sparkles } from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { ThinkingOrb } from 'thinking-orbs'

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

function ReadableAnswer({ text, stream = false }: { text: string; stream?: boolean }) {
  const [visible, setVisible] = useState(!stream)

  useEffect(() => {
    if (!stream) {
      setVisible(true)
      return
    }

    setVisible(false)
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [stream, text])

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
  let wordIndex = 0
  const animatedInline = (value: string, keyPrefix: string) => <>{value.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => {
    const bold = part.startsWith('**') && part.endsWith('**')
    const content = bold ? part.slice(2, -2) : part
    const words = content.split(/(\s+)/)
    const nodes = words.map((word, tokenIndex) => {
      if (!word || /^\s+$/.test(word)) return word
      const delay = wordIndex * 60
      wordIndex += 1
      return <span
        className={`t-stream-w ${visible ? 'is-in' : ''}`}
        style={{ '--stream-delay': `${delay}ms` } as React.CSSProperties}
        key={`${keyPrefix}-${partIndex}-${tokenIndex}`}
      >{word}</span>
    })
    return bold ? <strong key={`${keyPrefix}-${partIndex}`}>{nodes}</strong> : <span key={`${keyPrefix}-${partIndex}`}>{nodes}</span>
  })}</>

  const renderInline = (value: string, keyPrefix: string) => stream
    ? animatedInline(value, keyPrefix)
    : <InlineText text={value} />

  return <div className={`chat-readable ${stream ? 't-stream' : ''}`}>
    {blocks.map((block, index) => block.type === 'heading'
      ? <h3 key={index}>{renderInline(block.lines[0], `h-${index}`)}</h3>
      : block.type === 'list'
        ? <ul key={index}>{block.lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line, `l-${index}-${itemIndex}`)}</li>)}</ul>
        : <p key={index}>{block.lines.map((line, itemIndex) => <span key={itemIndex}>{renderInline(line, `p-${index}-${itemIndex}`)}{itemIndex < block.lines.length - 1 && <br />}</span>)}</p>
    )}
  </div>
}

const thinkingStates = [
  'Reading your college records…',
  'Checking notices and dates…',
  'Preparing your answer…',
]

function ThinkingState() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  useEffect(() => {
    let swapTimer = 0
    let firstFrame = 0
    let secondFrame = 0
    const interval = window.setInterval(() => {
      setPhase('exit')
      swapTimer = window.setTimeout(() => {
        setIndex(current => (current + 1) % thinkingStates.length)
        setPhase('enter')
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => setPhase('idle'))
        })
      }, 150)
    }, 2000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(swapTimer)
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])

  const text = thinkingStates[index]
  return <span className="t-think" role="status" aria-live="polite">
    <span className="t-think-sizer" aria-hidden="true">Reading your college records…</span>
    <span
      className={`t-think-text ${phase === 'exit' ? 'is-exit' : phase === 'enter' ? 'is-enter-start' : ''}`}
      data-text={text}
    >{text}</span>
  </span>
}

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
  >([
    {
      role: 'assistant',
      text: 'Hi Aashish. Ask about your Herald College notices and events. I can suggest calendar actions for you to approve.',
    },
  ])

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [motionAllowed, setMotionAllowed] = useState(() =>
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: 'smooth',
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

    setMessages(previous => [
      ...previous,
      {
        role: 'user',
        text: question.trim(),
      },
    ])

    setInput('')
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
    }
  }

  return (
    <>
      <PageIntro
        title="Ask AI"
        copy="Ask about saved notices and events, and approve suggested calendar actions."
      />

      <div className="chat-layout">
        <BorderBeam
          className="chat-beam"
          size="md"
          colorVariant="colorful"
          strength={1}
          brightness={1.85}
          saturation={1.5}
          duration={22.96}
          borderRadius={15}
          active={motionAllowed}
          theme={theme}
        >
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
                  {message.role === 'assistant' ? <ReadableAnswer text={message.text} stream={index > 0} /> : <p>{message.text}</p>}
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
              <div className="chat-message assistant chat-thinking">
                <span className="chat-thinking-orb">
                  <ThinkingOrb state="searching" size={64} />
                </span>
                <div className="chat-thinking-bubble"><ThinkingState /></div>
              </div>
            )}

            <div ref={bottom} />
          </div>

          <form
            className="chat-composer"
            onSubmit={e => {
              e.preventDefault()
              void ask(input)
            }}
          >
            <input
              placeholder="Ask about deadlines, notices, or events..."
              aria-label="Question about saved college records"
              maxLength={600}
              value={input}
              onChange={e => setInput(e.target.value)}
            />

            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Ask Herald Assistant"
            >
              <ArrowRight size={19} />
            </button>
          </form>
          <p className="chat-disclaimer">Relevant notice, event, and extracted file text goes to Gemini through your n8n workflow. Your own fee-status marks stay local. Unread files still need to be opened manually.</p>
        </section>
        </BorderBeam>
        <aside className="chat-suggestions">
          <h2>Try asking</h2>
          {['What deadlines are coming up?', 'Show recent notices', 'Which fees have I marked paid?', 'Find my exam documents'].map(prompt => (
            <button key={prompt} onClick={() => void ask(prompt)} disabled={busy}>
              {prompt} <ArrowRight size={15} />
            </button>
          ))}
        </aside>
      </div>
    </>
  )
}
