import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'

import { studentService } from '../services/mockService'
import { PageIntro } from '../components/UI'
import './AskAI.css'

export default function AskAI() {
  const [messages, setMessages] = useState<
    {
      role: 'user' | 'assistant'
      text: string
    }[]
  >([
    {
      role: 'assistant',
      text: 'Hi Aashish. Ask me about your college updates.',
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

    const answer = await studentService.askAI(question)

    setMessages(previous => [
      ...previous,
      {
        role: 'assistant',
        text: answer,
      },
    ])

    setBusy(false)
  }

  return (
    <>
      <PageIntro
        title="Ask AI"
        copy="Ask questions about your college information."
      />

      <div className="chat-layout">
        <section className="chat-panel">
          <div className="chat-header">
            <span className="chat-ai-icon">
              <Sparkles size={20} />
            </span>

            <div>
              <strong>Herald Assistant</strong>
              <small>Your student workspace assistant</small>
            </div>

            <span className="online-dot" />
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

                <p>{message.text}</p>
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
              ask(input)
            }}
          >
            <input
              placeholder="Ask anything about college..."
              value={input}
              onChange={e => setInput(e.target.value)}
            />

            <button
              type="submit"
              disabled={!input.trim() || busy}
            >
              <ArrowRight size={19} />
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
