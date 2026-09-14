import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react'

import { studentService } from '../services/mockService'
import type { AssistantSource } from '../services/localAssistant'
import type { EventItem, Payment } from '../data'
import { PageIntro } from '../components/UI'
import './AskAI.css'

export default function AskAI({ payments, events, updateCalendar }: {
  payments: Payment[]
  events: EventItem[]
  updateCalendar: (event: EventItem, state: EventItem['calendarState']) => Promise<void>
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

  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, busy])

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
                  <p>{message.text}</p>
                  {message.mode === 'search' && <small className="chat-answer-mode">Saved-record search</small>}
                  {!!message.sources?.length && (
                    <div className="chat-sources">
                      {message.sources.map(source => source.url ? (
                        <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.kind}: {source.title} <ExternalLink size={12} />
                        </a>
                      ) : <span key={source.id}>{source.kind}: {source.title}</span>)}
                    </div>
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
          <p className="chat-disclaimer">Notice and event details are sent to Gemini through your n8n workflow. Fees and file searches stay local. PDFs and images are not read yet.</p>
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
    </>
  )
}
