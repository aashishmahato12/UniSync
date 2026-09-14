import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react'

import { studentService } from '../services/mockService'
import type { AssistantSource } from '../services/localAssistant'
import type { Payment } from '../data'
import { PageIntro } from '../components/UI'
import './AskAI.css'

export default function AskAI({ payments }: { payments: Payment[] }) {
  const [messages, setMessages] = useState<
    {
      role: 'user' | 'assistant'
      text: string
      sources?: AssistantSource[]
    }[]
  >([
    {
      role: 'assistant',
      text: 'Hi Aashish. Search your saved Herald College notices, events, and document details.',
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
      }])
    } catch {
      setMessages(previous => [...previous, {
        role: 'assistant',
        text: 'I could not load your college records. Please try again.',
      }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageIntro
        title="Ask AI"
        copy="Find answers in your saved college records, with links to the original emails."
      />

      <div className="chat-layout">
        <section className="chat-panel">
          <div className="chat-header">
            <span className="chat-ai-icon">
              <Sparkles size={20} />
            </span>

            <div>
              <strong>Herald Assistant</strong>
              <small>Searches your private college records</small>
            </div>

            <span className="chat-mode">Saved records</span>
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
                  {!!message.sources?.length && (
                    <div className="chat-sources">
                      {message.sources.map(source => source.url ? (
                        <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.kind}: {source.title} <ExternalLink size={12} />
                        </a>
                      ) : <span key={source.id}>{source.kind}: {source.title}</span>)}
                    </div>
                  )}
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
              placeholder="Ask about deadlines, notices, or files..."
              aria-label="Question about saved college records"
              maxLength={600}
              value={input}
              onChange={e => setInput(e.target.value)}
            />

            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Search college records"
            >
              <ArrowRight size={19} />
            </button>
          </form>
          <p className="chat-disclaimer">Uses saved email summaries and file details. PDF and image contents are not read yet.</p>
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
