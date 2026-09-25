import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import LoanForm from './components/LoanForm.jsx'
import LoanList from './components/LoanList.jsx'
import LoginForm from './components/LoginForm.jsx'
import SearchBox from './components/SearchBox.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { onSessionChange, signIn, signOut } from './lib/auth.js'
import { toIsoDate } from './lib/dateFormat.js'
import { SESSION_EXPIRED_MESSAGE, createLoan, fetchLoans, updateLoan } from './lib/loanRepo.js'
import { filterLoansByFriend, markReturned, unmarkReturned } from './lib/loanRules.js'
import { getSupabase } from './lib/supabaseClient.js'
import { getInitialTheme, saveTheme, toggleTheme } from './lib/theme.js'

// หน้า Loan ของเจ้าที่เข้าสู่ระบบแล้ว เก็บ state ของ Loan
// ข้อมูลอยู่ที่ Supabase: อัปเดตหน้าจอเมื่อเขียนสำเร็จเท่านั้น ถ้าไม่สำเร็จแจ้งเป็นภาษาไทยและไม่ทิ้งข้อมูลในฟอร์ม
function LoanManager({ onSessionExpired }) {
  const [loans, setLoans] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [message, setMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchLoans().then(({ loans: fetched, error, sessionExpired }) => {
      if (cancelled) return
      if (sessionExpired) {
        onSessionExpired()
        return
      }
      if (error) {
        setMessage(error)
        setLoadState('error')
        return
      }
      setMessage(null)
      setLoans(fetched)
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [reloadKey, onSessionExpired])

  const handleRetry = () => {
    setLoadState('loading')
    setReloadKey((k) => k + 1)
  }

  const today = toIsoDate(new Date())
  const editingLoan = loans.find((loan) => loan.id === editingId) ?? null
  const visibleLoans = filterLoansByFriend(loans, query)

  // คืน true เมื่อบันทึกสำเร็จ ผลลัพธ์จาก loanRepo ทุกตัวผ่านฟังก์ชันนี้
  const applyResult = (result) => {
    if (result.sessionExpired) {
      onSessionExpired()
      return false
    }
    if (result.error) {
      setMessage(result.error)
      return false
    }
    setMessage(null)
    const saved = result.loan
    setLoans((prev) =>
      prev.some((l) => l.id === saved.id)
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [...prev, saved],
    )
    return true
  }

  // Loan ที่ยังไม่มี id คือเพิ่มใหม่ ถ้ามี id คือแก้ไขรายการเดิม
  const handleSave = async (loan) => {
    const saved = applyResult(loan.id ? await updateLoan(loan) : await createLoan(loan))
    if (saved) setEditingId(null)
    return saved
  }

  const handleMarkReturned = async (loan, returnedDate) => {
    applyResult(await updateLoan(markReturned(loan, today, returnedDate)))
  }

  const handleUnmarkReturned = async (loan) => {
    applyResult(await updateLoan(unmarkReturned(loan)))
  }

  if (loadState === 'loading') return <p>กำลังโหลดรายการ...</p>

  if (loadState === 'error') {
    return (
      <>
        <p role="alert">{message}</p>
        <div className="form-actions">
          <button type="button" onClick={handleRetry}>
            ลองใหม่
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {message && <p role="alert">{message}</p>}
      <LoanForm
        key={editingLoan?.id ?? 'new'}
        today={today}
        editingLoan={editingLoan}
        onSave={handleSave}
        onCancelEdit={() => setEditingId(null)}
      />
      <SearchBox value={query} onChange={setQuery} />
      <LoanList
        loans={visibleLoans}
        today={today}
        onMarkReturned={handleMarkReturned}
        onUnmarkReturned={handleUnmarkReturned}
        onEdit={(loan) => setEditingId(loan.id)}
      />
    </>
  )
}

function readConfigError() {
  try {
    getSupabase()
    return null
  } catch (e) {
    return e.message
  }
}

function App() {
  const [configError] = useState(readConfigError)
  // session: undefined = กำลังตรวจสอบ, null = ยังไม่เข้าสู่ระบบ, object = เข้าสู่ระบบแล้ว
  const [session, setSession] = useState(configError ? null : undefined)
  const [notice, setNotice] = useState(null)
  const [theme, setTheme] = useState(() =>
    getInitialTheme(undefined, window.matchMedia('(prefers-color-scheme: dark)').matches),
  )

  // ตั้งธีมให้ <html> ก่อนวาดหน้าจอ เพื่อไม่ให้จอกะพริบ
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // ติดตามสถานะ session (ค่าเริ่มต้นตอนเปิดหน้า, เข้า/ออกจากระบบ, session หมดอายุ)
  useEffect(() => {
    if (configError) return undefined
    return onSessionChange(setSession)
  }, [configError])

  const handleToggleTheme = () => {
    const next = toggleTheme(theme)
    setTheme(next)
    saveTheme(next)
  }

  // คืนข้อความผิดพลาดภาษาไทย หรือ null เมื่อสำเร็จ (session จะอัปเดตผ่าน onSessionChange)
  const handleSignIn = async (email, password) => {
    setNotice(null)
    const { error } = await signIn(email, password)
    return error
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) setNotice(error)
  }

  // session หมดอายุ/ไม่มีสิทธิ์: กลับหน้าเข้าสู่ระบบพร้อมแจ้งเตือน
  const handleSessionExpired = useCallback(async () => {
    setNotice(SESSION_EXPIRED_MESSAGE)
    await signOut()
    setSession(null)
  }, [])

  return (
    <main>
      <header className="app-header">
        <h1>Borrow Buddy</h1>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          {session && (
            <button type="button" onClick={handleSignOut}>
              ออกจากระบบ
            </button>
          )}
        </div>
      </header>
      {configError && <p role="alert">{configError}</p>}
      {notice && <p role="alert">{notice}</p>}
      {!configError && session === undefined && <p>กำลังตรวจสอบการเข้าสู่ระบบ...</p>}
      {!configError && session === null && <LoginForm onSignIn={handleSignIn} />}
      {session && <LoanManager key={session.user.id} onSessionExpired={handleSessionExpired} />}
    </main>
  )
}

export default App
