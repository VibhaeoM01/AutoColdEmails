import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [emails, setEmails] = useState('')
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [estTime, setEstTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [usingDefault, setUsingDefault] = useState(true)
  const [buttonText, setButtonText] = useState('Send')
  const intervalRef = useRef(null)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const startTimeRef = useRef(null)

  const DEFAULT_AVG = 180 // 3 min per email

  const handleSend = async () => {
    const emailList = emails
      .split(/[\,\n;]/)
      .map(e => e.trim())
      .filter(e => e.length > 0)
    if (emailList.length === 0) {
      setStatus('Please enter at least one email.')
      return
    }
    setSending(true)
    setButtonText('Sending...')
    setStatus('Sending emails...')
    setSentCount(0)
    setTotalCount(emailList.length)
    setEstTime(emailList.length * DEFAULT_AVG)
    setCountdown(emailList.length * DEFAULT_AVG)
    setElapsed(0)
    setUsingDefault(true)
    startTimeRef.current = Date.now()
    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    // Start countdown timer (only if backend responds OK)
    try {
      const res = await fetch('http://localhost:5000/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailList }),
      })
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatus(data.message || 'Emails sent!')
      // Start timers and polling only if backend is OK
      if (countdownRef.current) clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c > 1) return c - 1
          clearInterval(countdownRef.current)
          return c // Don't go to 0, keep last value
        })
      }, 1000)
      intervalRef.current = setInterval(async () => {
        try {
          const resp = await fetch('http://localhost:5000/sent-count')
          if (!resp.ok) throw new Error('Server error')
          const prog = await resp.json()
          setSentCount(prog.sent || 0)
          // Calculate average delay per email so far
          const emailsSent = prog.sent || 0
          const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
          let avgDelaySec = emailsSent > 0 ? elapsedSec / emailsSent : DEFAULT_AVG
          // Estimate time left
          const left = emailList.length - emailsSent
          const newEst = Math.max(0, Math.round(left * avgDelaySec))
          setEstTime(newEst)
          // Only reset countdown if estimate changes by more than 5 seconds and after first email is sent
          setCountdown(prev => {
            if (emailsSent === 0) return prev // use default countdown until first email sent
            setUsingDefault(false)
            if (prev === null || Math.abs(newEst - prev) > 5) {
              if (countdownRef.current) clearInterval(countdownRef.current)
              if (newEst > 0) {
                countdownRef.current = setInterval(() => {
                  setCountdown(c => {
                    if (c > 1) return c - 1
                    clearInterval(countdownRef.current)
                    return c // Don't go to 0, keep last value
                  })
                }, 1000)
              }
              return newEst
            }
            return prev
          })
          if (prog.allDone && prog.sent >= emailList.length) {
            clearInterval(intervalRef.current)
            clearInterval(timerRef.current)
            clearInterval(countdownRef.current)
            setSending(false)
            setStatus('✅ All emails sent successfully!')
            setEstTime(null)
            setCountdown(null)
            setButtonText('Send')
            setEmails('')
          }
        } catch (err) {
          setStatus('Server error while tracking progress.')
          setSending(false)
          setButtonText('Send')
          clearInterval(intervalRef.current)
          clearInterval(countdownRef.current)
        }
      }, 2000)
    } catch (err) {
      setStatus('Server error: could not start campaign.')
      setSending(false)
      setEstTime(null)
      setCountdown(null)
      setButtonText('Send')
      clearInterval(countdownRef.current)
    }
  }

  function formatTime(sec) {
    if (sec == null) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    if (m > 0) return `${m} min ${s} sec`
    return `${s} sec`
  }

  return (
    <div className="container">
      <h1>Cold Email Automation</h1>
      <textarea
        rows={8}
        placeholder="Enter email addresses, separated by commas, semicolons, or new lines."
        value={emails}
        onChange={e => setEmails(e.target.value)}
        disabled={sending}
        style={{ width: '100%', marginBottom: 12 }}
      />
      <br />
      <button onClick={handleSend} disabled={sending} style={{ padding: '10px 20px', fontSize: 16 }}>
        {buttonText}
      </button>
      <div style={{ marginTop: 20, minHeight: 24 }}>{status}</div>
      {sending || sentCount > 0 ? (
        <div style={{ marginTop: 10 }}>
          Progress: {sentCount} / {totalCount}
          <br />
          {sending && (countdown > 0) && (
            <>
              <span>Estimated time left: {formatTime(countdown)}</span>
              {usingDefault && <span style={{ color: '#888', fontSize: 12 }}> (default estimate)</span>}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default App
