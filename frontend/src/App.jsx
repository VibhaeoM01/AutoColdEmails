import { useState, useRef, useEffect } from 'react'
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
  const [buttonText, setButtonText] = useState('Schedule Emails')
  const [emailType, setEmailType] = useState('cold')
  const [companyDetails, setCompanyDetails] = useState({ companyName: '', position: '', jobId: '' })
  const [daysToDelay, setDaysToDelay] = useState(0)
  const [showTemplate, setShowTemplate] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [failedEmails, setFailedEmails] = useState([])
  const [hasErrors, setHasErrors] = useState(false)
  const [emailsInProgress, setEmailsInProgress] = useState([])
  const [allEmailsSent, setAllEmailsSent] = useState([])
  const [testingAuth, setTestingAuth] = useState(false)
  const intervalRef = useRef(null)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const startTimeRef = useRef(null)

  const DEFAULT_AVG = 180 // 3 min per email

  // Load saved data from localStorage
  useEffect(() => {
    const savedEmails = localStorage.getItem('savedEmails')
    const savedCompanyDetails = localStorage.getItem('savedCompanyDetails')
    const savedEmailType = localStorage.getItem('savedEmailType')
    const savedDaysToDelay = localStorage.getItem('savedDaysToDelay')
    const savedSenderName = localStorage.getItem('savedSenderName')
    const savedEmailsInProgress = localStorage.getItem('savedEmailsInProgress')
    const savedAllEmailsSent = localStorage.getItem('savedAllEmailsSent')
    
    if (savedEmails) setEmails(savedEmails)
    if (savedCompanyDetails) setCompanyDetails(JSON.parse(savedCompanyDetails))
    if (savedEmailType) setEmailType(savedEmailType)
    if (savedDaysToDelay) setDaysToDelay(parseInt(savedDaysToDelay))
    if (savedSenderName) setSenderName(savedSenderName)
    if (savedEmailsInProgress) setEmailsInProgress(JSON.parse(savedEmailsInProgress))
    if (savedAllEmailsSent) setAllEmailsSent(JSON.parse(savedAllEmailsSent))
    
    // If there are emails in progress, restore the sending state and start polling
    if (savedEmailsInProgress) {
      const inProgress = JSON.parse(savedEmailsInProgress)
      if (inProgress.length > 0) {
        setSending(true)
        setEmailsInProgress(inProgress)
        setTotalCount(inProgress.length)
        
        // Start polling to check progress
        intervalRef.current = setInterval(async () => {
          try {
            const resp = await fetch('http://localhost:5000/sent-count')
            if (!resp.ok) throw new Error('Server error')
            const prog = await resp.json()
            setSentCount(prog.sent || 0)
            setHasErrors(prog.hasErrors || false)
            
            const emailsSent = prog.sent || 0
            const emailsFailed = prog.failed || 0
            const totalProcessed = emailsSent + emailsFailed
            
            // Check if all emails are processed
            if (prog.allDone && totalProcessed >= inProgress.length) {
              clearInterval(intervalRef.current)
              setSending(false)
              
              // Move completed emails to allEmailsSent
              setAllEmailsSent(prev => [...prev, ...inProgress])
              setEmailsInProgress([])
              
              if (prog.hasErrors) {
                setStatus(`❌ Email campaign completed with ${prog.failed || 0} errors out of ${inProgress.length} emails.`)
              } else {
                setStatus(`✅ All ${inProgress.length} emails have been scheduled and sent successfully!`)
              }
            }
          } catch (err) {
            console.error('Error checking progress after reload:', err)
          }
        }, 2000)
      }
    }
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('savedEmails', emails)
    localStorage.setItem('savedCompanyDetails', JSON.stringify(companyDetails))
    localStorage.setItem('savedEmailType', emailType)
    localStorage.setItem('savedDaysToDelay', daysToDelay.toString())
    localStorage.setItem('savedSenderName', senderName)
    localStorage.setItem('savedEmailsInProgress', JSON.stringify(emailsInProgress))
    localStorage.setItem('savedAllEmailsSent', JSON.stringify(allEmailsSent))
  }, [emails, companyDetails, emailType, daysToDelay, senderName, emailsInProgress, allEmailsSent])

  // Calculate realistic estimate based on email delays
  const calculateRealisticEstimate = (emailCount) => {
    if (emailCount <= 1) return 0
    
    // Each email has 5-10 minute delay (average 7.5 minutes = 450 seconds)
    // Plus some buffer for processing time
    const avgDelayPerEmail = 450 // 7.5 minutes
    const totalDelay = (emailCount - 1) * avgDelayPerEmail // -1 because first email has no delay
    
    return totalDelay
  }

  const testEmailConnection = async () => {
    setTestingAuth(true)
    setStatus('Testing email connection...')
    
    try {
      const authRes = await fetch('http://localhost:5000/test-auth')
      if (!authRes.ok) {
        const text = await authRes.text()
        let errorData
        try {
          errorData = JSON.parse(text)
        } catch (parseError) {
          throw new Error(`Server error: ${authRes.status} - ${text.substring(0, 100)}`)
        }
        throw new Error(`Email authentication failed: ${errorData.error}`)
      }
      
      const data = await authRes.json()
      setStatus('✅ Email connection successful! You can now schedule emails.')
    } catch (err) {
      setStatus(`❌ ${err.message}`)
    } finally {
      setTestingAuth(false)
    }
  }

  const emailTemplates = {
    cold: {
      name: 'Cold Email',
      description: 'General outreach to a company or individual.'
    },
    referral: {
      name: 'Referral Request',
      description: 'Ask for a job referral from a connection.'
    },
    hr: {
      name: 'HR Follow-up',
      description: 'Follow up with HR after an application or interview.'
    }
  }

  const handleSend = async () => {
    const emailList = emails.split(/[\,\n;]/).map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'))
    if (emailList.length === 0) {
      setStatus('Please enter at least one valid email address.')
      return
    }
    if (!senderName) {
      setStatus('Please enter your name.')
      return
    }
    if (emailType === 'referral' || emailType === 'hr') {
      if (!companyDetails.companyName || !companyDetails.position) {
        setStatus('Please fill in company name and position for this email type.')
        return
      }
    }
    
    if (emailType === 'referral') {
      if (!companyDetails.jobId) {
        setStatus('Please fill in job ID for referral requests.')
        return
      }
    }
    
    setSending(true)
    setButtonText('Scheduling...')
    setStatus(`Scheduling ${emailList.length} emails with strategic timing (5-10 min delays between emails)... You can add more emails while these are being processed.`)
    setSentCount(0)
    setTotalCount(emailList.length)
    const realisticEstimate = calculateRealisticEstimate(emailList.length)
    setEstTime(realisticEstimate)
    setCountdown(realisticEstimate)
    setUsingDefault(false)
    setHasErrors(false)
    setFailedEmails([])
    
    // Add these emails to the in-progress list
    setEmailsInProgress(prev => [...prev, ...emailList])
    
    // Clear the input field for new emails
    setEmails('')
    
    startTimeRef.current = Date.now()

    try {
      // First, test email authentication
      setStatus('Testing email authentication...')
      const authRes = await fetch('http://localhost:5000/test-auth')
      if (!authRes.ok) {
        const text = await authRes.text()
        let authError
        try {
          authError = JSON.parse(text)
        } catch (parseError) {
          throw new Error(`Server error: ${authRes.status} - ${text.substring(0, 100)}`)
        }
        throw new Error(`Email authentication failed: ${authError.error}. ${authError.details}`)
      }
      
      // If authentication passes, proceed with scheduling
      setStatus(`Scheduling ${emailList.length} emails with strategic timing (5-10 min delays between emails)... You can add more emails while these are being processed.`)
      
      const res = await fetch('http://localhost:5000/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emails: emailList, 
          emailType, 
          companyDetails,
          daysToDelay,
          senderName
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        let data
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          throw new Error(`Server error: ${res.status} - ${text.substring(0, 100)}`)
        }
        if (data.error) throw new Error(data.error)
        throw new Error('Server error')
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatus(data.message || 'Emails scheduled successfully!')
      
      // Start timers and polling only if backend is OK
      if (countdownRef.current) clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c > 1) return c - 1
          clearInterval(countdownRef.current)
          return c
        })
      }, 1000)
      
      intervalRef.current = setInterval(async () => {
        try {
          const resp = await fetch('http://localhost:5000/sent-count')
          if (!resp.ok) {
            const text = await resp.text()
            throw new Error(`Server error: ${resp.status} - ${text.substring(0, 100)}`)
          }
          const prog = await resp.json()
          setSentCount(prog.sent || 0)
          setHasErrors(prog.hasErrors || false)
          
          const emailsSent = prog.sent || 0
          const emailsFailed = prog.failed || 0
          const totalProcessed = emailsSent + emailsFailed
          
          // Only update estimate if we have actual progress
          if (totalProcessed > 0) {
            const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
            const avgTimePerEmail = elapsedSec / totalProcessed
            const remainingEmails = emailsInProgress.length - totalProcessed
            const newEst = Math.max(0, Math.round(remainingEmails * avgTimePerEmail))
            
            setEstTime(newEst)
            setCountdown(prev => {
              if (newEst > 0 && (prev === null || Math.abs(newEst - prev) > 10)) {
                if (countdownRef.current) clearInterval(countdownRef.current)
                countdownRef.current = setInterval(() => {
                  setCountdown(c => {
                    if (c > 1) return c - 1
                    clearInterval(countdownRef.current)
                    return c
                  })
                }, 1000)
                return newEst
              }
              return prev
            })
          }
          
          // Check if all emails are processed (sent or failed)
          if (prog.allDone && totalProcessed >= emailsInProgress.length) {
            clearInterval(intervalRef.current)
            clearInterval(countdownRef.current)
            setSending(false)
            setEstTime(null)
            setCountdown(null)
            
            // Move completed emails to allEmailsSent
            setAllEmailsSent(prev => [...prev, ...emailsInProgress])
            setEmailsInProgress([])
            
            if (prog.hasErrors) {
              // Get detailed error information
              try {
                const errorResp = await fetch('http://localhost:5000/email-status')
                if (errorResp.ok) {
                  const errorData = await errorResp.json()
                  setFailedEmails(errorData.failedEmails || [])
                  setStatus(`❌ Email campaign completed with ${prog.failed || 0} errors out of ${emailsInProgress.length} emails. Check details below.`)
                } else {
                  setStatus(`❌ Email campaign completed with ${prog.failed || 0} errors out of ${emailsInProgress.length} emails.`)
                }
              } catch (err) {
                setStatus(`❌ Email campaign completed with ${prog.failed || 0} errors out of ${emailsInProgress.length} emails.`)
              }
            } else {
              setStatus(`✅ All ${emailsInProgress.length} emails have been scheduled and sent successfully!`)
            }
            
            setButtonText('Schedule Emails')
          }
        } catch (err) {
          setStatus('Server error while tracking progress.')
          setSending(false)
          setButtonText('Schedule Emails')
          clearInterval(intervalRef.current)
          clearInterval(countdownRef.current)
        }
      }, 2000)
    } catch (err) {
      setStatus(`❌ ${err.message}`)
      setSending(false)
      setEstTime(null)
      setCountdown(null)
      setButtonText('Schedule Emails')
      clearInterval(countdownRef.current)
      
      // Don't clear emails in progress if it's an auth error
      if (!err.message.includes('authentication')) {
        setEmailsInProgress([])
      }
    }
  }

  function formatTime(sec) {
    if (sec == null) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    if (m > 0) return `${m} min ${s} sec`
    return `${s} sec`
  }

  const getCurrentBusinessHoursStatus = () => {
    const now = new Date()
    const hour = now.getHours()
    const isBusinessHours = hour >= 10 && hour < 16
    const isWeekend = now.getDay() === 0 || now.getDay() === 6
    
    if (isWeekend) return 'Weekend - Emails will be scheduled for Monday'
    if (!isBusinessHours) return 'Outside business hours - Emails will be scheduled for next business day'
    return 'Business hours - Emails will be sent with random delays'
  }

  const getScheduledDate = () => {
    if (daysToDelay === 0) return 'Today'
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + daysToDelay)
    return scheduledDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Advanced Email Automation</h1>
        <p>Schedule emails with strategic timing to avoid spam filters and increase open rates.</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <div className="input-group">
            <label htmlFor="emails">Recipient Emails</label>
            <textarea
              id="emails"
              rows={5}
              placeholder="Enter emails, separated by commas, newlines, or semicolons."
              value={emails}
              onChange={e => setEmails(e.target.value)}
              disabled={sending}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="emailType">Email Type</label>
            <select
              id="emailType"
              value={emailType}
              onChange={e => setEmailType(e.target.value)}
              disabled={sending}
            >
              {Object.entries(emailTemplates).map(([key, { name }]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
            <p className="email-type-desc">{emailTemplates[emailType].description}</p>
          </div>

          {(emailType === 'referral' || emailType === 'hr') && (
            <div className="company-inputs">
              <input
                type="text"
                placeholder="Company Name"
                value={companyDetails.companyName}
                onChange={e => setCompanyDetails(prev => ({...prev, companyName: e.target.value}))}
                disabled={sending}
              />
              <input
                type="text"
                placeholder="Position"
                value={companyDetails.position}
                onChange={e => setCompanyDetails(prev => ({...prev, position: e.target.value}))}
                disabled={sending}
              />
            </div>
          )}
          {emailType === 'referral' && (
             <div className="company-inputs">
               <input
                type="text"
                placeholder="Job ID (Optional)"
                value={companyDetails.jobId}
                onChange={e => setCompanyDetails(prev => ({...prev, jobId: e.target.value}))}
                disabled={sending}
              />
             </div>
          )}

          <div className="input-group">
            <label htmlFor="daysToDelay">Days to Delay</label>
            <input
              id="daysToDelay"
              type="number"
              min="0"
              max="30"
              value={daysToDelay}
              onChange={e => setDaysToDelay(parseInt(e.target.value, 10))}
              disabled={sending}
            />
            <p className="email-type-desc">Emails will be sent on: <strong>{getScheduledDate()}</strong></p>
          </div>
          
          <div className="button-group">
            <button
              onClick={handleSend}
              disabled={sending || testingAuth}
              className="primary"
            >
              {buttonText}
            </button>
            <button onClick={testEmailConnection} disabled={sending || testingAuth}>
              Test Connection
            </button>
          </div>
        </div>

        {(sending || status) && (
          <div className="status-card">
            <h4>Campaign Status</h4>
            {sending && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${totalCount > 0 ? (sentCount / totalCount) * 100 : 0}%` }}
                ></div>
              </div>
            )}
            <p className={`status-message ${hasErrors ? 'error' : ''}`}>{status}</p>
            {countdown !== null && countdown > 0 && (
              <p><strong>Approx. time remaining:</strong> {formatTime(countdown)}</p>
            )}
            {hasErrors && failedEmails.length > 0 && (
              <div className="error-box">
                <h5>Failed Emails:</h5>
                <ul>
                  {failedEmails.map((e, i) => (
                    <li key={i}>
                      <strong>{e.email}:</strong> {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
