import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import Navbar from './Components/Navbar.jsx'
import './App.css'
const API_URL = '/api/feedback'
async function requestFeedback(url = API_URL, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const result = isJson ? await response.json() : null
  if (!response.ok) {
    const message =
      result?.error ||
      (response.status === 502
        ? 'Feedback API is unavailable. Start the backend and connect it to MongoDB Atlas.'
        : `The request failed with status ${response.status}. Please try again.`)
    throw new Error(message)
      }
  if (response.status === 204) return null
  if (!isJson) throw new Error('The feedback API returned an unexpected response.')
  return result
}
function Rating({ value, showValue = true }) {
  return (
    <span className="rating" aria-label={`${value} out of 5 stars`}>
      <span className="rating-stars" aria-hidden="true">
        {'★'.repeat(value)}<span className="rating-empty">{'★'.repeat(5 - value)}</span>
      </span>
      {showValue && <span className="rating-value">{value}.0</span>}
    </span>
  )
}
function Dashboard({ feedback, onEdit, onDelete, onNavigate }) {
  const [search, setSearch] = useState('')
  const average = feedback.length
    ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
    : 0
  const filteredFeedback = useMemo(
    () =>
      feedback.filter((item) =>
        `${item.courseName} ${item.courseId} ${item.comments}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [feedback, search],
  )
  return (
    <>
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="eyebrow">COURSE FEEDBACK</span>
          <h1>Dashboard</h1>
          <p>Review learner feedback and course ratings in one place.</p>
          <button className="button button-dark welcome-button" onClick={() => onNavigate('/add-feedback')}>
            Add feedback
          </button>
        </div>
      </section>
      <section className="stats-grid" aria-label="Feedback overview">
        <article className="stat-card">
          <span className="stat-label">REVIEWS SUBMITTED</span>
          <strong>{feedback.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">AVERAGE RATING</span>
          <strong>{feedback.length ? average.toFixed(1) : '—'}<small>{feedback.length ? ' / 5' : ''}</small></strong>
        </article>
      </section>
      <section className="feedback-section">
        <div className="section-heading">
          <div>
            <h2>All feedback <span className="count-pill">{feedback.length}</span></h2>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search feedback"
              aria-label="Search course feedback"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="feedback-table-wrap">
          <table className="feedback-table">
            <thead>
              <tr>
                <th>COURSE ID</th>
                <th>COURSE</th>
                <th>DURATION</th>
                <th>OVERALL RATING</th>
                <th>LEARNER NOTE</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.map((item) => (
                <tr key={item.id}>
                  <td><span className="course-id">{item.courseId}</span></td>
                  <td><span className="course-name">{item.courseName}</span></td>
                  <td><span className="duration-chip">{item.duration}</span></td>
                  <td><Rating value={item.rating} /></td>
                  <td className="comment-cell" title={item.comments}>{item.comments}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button" aria-label={`Edit feedback for ${item.courseName}`} title="Edit feedback" onClick={() => onEdit(item)}>
                        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13.8 3.2 3 3M3.5 16.5l3.7-.8L16.4 6.5a2.1 2.1 0 0 0-3-3l-9.2 9.2-.7 3.8Z" /></svg>
                      </button>
                      <button className="icon-button icon-button-danger" aria-label={`Delete feedback for ${item.courseName}`} title="Delete feedback" onClick={() => onDelete(item)}>
                        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m2 0-.7 10H6.7L6 6m2.5 3v4m3-4v4" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFeedback.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <strong>{search ? 'No matching feedback' : 'No feedback yet'}</strong>
                      <p>{search ? 'Try another search term.' : 'Add feedback to see it listed here.'}</p>
                      {!search && <button className="button button-dark" onClick={() => onNavigate('/add-feedback')}>Add feedback</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
function FeedbackForm({ initialValue, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(() => ({
    courseName: initialValue?.courseName ?? '',
    duration: initialValue?.duration ?? '',
    comments: initialValue?.comments ?? '',
    rating: initialValue?.rating ?? 5,
  }))
  const [error, setError] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await onSubmit({ ...form, rating: Number(form.rating) })
    } catch (submitError) {
      setError(submitError.message)
    }
  }
  return (
    <section className="form-layout">
      <div className="form-intro">
        <span className="eyebrow">COURSE FEEDBACK</span>
        <h1>{initialValue ? 'Edit feedback' : 'Add feedback'}</h1>
        <p>Share your course experience and rating.</p>
      </div>
      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-step">{initialValue ? 'EDIT FEEDBACK' : 'YOUR FEEDBACK'}</span>
          <h2>{initialValue ? 'A quick update' : 'Tell us what you think'}</h2>
          <p>Fields marked with <span className="required-star">*</span> are required.</p>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="field-label" htmlFor="courseName">Course name <span className="required-star">*</span></label>
        <input
          className="text-field"
          id="courseName"
          name="courseName"
          type="text"
          placeholder="e.g. Introduction to UX Design"
          maxLength="120"
          value={form.courseName}
          onChange={updateField}
          required/>
        <label className="field-label" htmlFor="duration">Course duration <span className="required-star">*</span></label>
        <input
          className="text-field"
          id="duration"
          name="duration"
          type="text"
          placeholder="e.g. 6 weeks"
          maxLength="40"
          value={form.duration}
          onChange={updateField}
          required/>
        <label className="field-label" htmlFor="comments">Feedback comments <span className="required-star">*</span></label>
        <textarea
          className="text-field text-area"
          id="comments"
          name="comments"
          placeholder="What worked well? What could be even better?"
          maxLength="1000"
          rows="4"
          value={form.comments}
          onChange={updateField}
          required/>
        <span className="field-hint">{form.comments.length}/1000 characters</span>
        <fieldset className="rating-field">
          <legend className="field-label">Overall feedback rating <span className="required-star">*</span></legend>
          <div className="rating-options">
            {[1, 2, 3, 4, 5].map((rating) => (
              <label className={`rating-option ${Number(form.rating) === rating ? 'rating-option-selected' : ''}`} key={rating}>
                <input type="radio" name="rating" value={rating} checked={Number(form.rating) === rating} onChange={updateField} />
                <span className="rating-option-star" aria-hidden="true">★</span>
                <span>{rating}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button button-dark" disabled={saving}>
            {saving ? 'Saving…' : initialValue ? 'Save changes' : 'Submit feedback'} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </section>
  )
}
function EditFeedbackRoute({ feedback, onSubmit, onCancel, saving }) {
  const { id } = useParams()
  const editing = feedback.find((item) => item.id === id)

  if (!editing) {
    return (
      <div className="empty-state route-empty">
        <strong>NotFound.</strong>
        <p>It may have been removed or the link may be out of date.</p>
        <button className="button button-dark" onClick={onCancel}>Back to dashboard</button>
      </div>
    )
  }

  return (
    <FeedbackForm
      key={editing.id}
      initialValue={editing}
      onSubmit={(values) => onSubmit(values, editing)}
      onCancel={onCancel}
      saving={saving}
    />
  )
}
function App() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const controller = new AbortController()
    requestFeedback(API_URL, { signal: controller.signal })
      .then(setFeedback)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  async function saveFeedback(values, editing = null) {
    setSaving(true)
    try {
      const saved = await requestFeedback(
        editing ? `${API_URL}/${encodeURIComponent(editing.id)}` : API_URL,
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(values),
        },
      )
      setFeedback((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      )
      navigate('/')
      setNotice(editing ? 'Your feedback has been updated.' : 'Your feedback has been added. Thanks for sharing!')
    } finally {
      setSaving(false)
    }
  }
  async function deleteFeedback(item) {
    if (!window.confirm(`Delete the feedback for "${item.courseName}"? This cannot be undone.`)) return
    try {
      await requestFeedback(`${API_URL}/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      setFeedback((current) => current.filter((entry) => entry.id !== item.id))
      setNotice('Feedback deleted.')
    } catch (error) {
      setLoadError(error.message)
    }
  }
  return (
    <div className="app-shell">
      <Navbar currentPath={location.pathname} />
      <main className="page-content">
        {notice && <div className="notice-banner" role="status"><span aria-hidden="true">✓</span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
        {loadError && (
          <div className="error-banner" role="alert">
            <span>{loadError}</span>
            <button className="text-link" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
        {loading ? (
          <div className="loading-state"><span className="loading-spinner" /> Loading your feedback…</div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  feedback={feedback}
                  onEdit={(item) => navigate(`/feedback/${encodeURIComponent(item.id)}/edit`)}
                  onDelete={deleteFeedback}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/add-feedback"
              element={
                <FeedbackForm
                  onSubmit={saveFeedback}
                  onCancel={() => navigate('/')}
                  saving={saving}
                />
              }
            />
            <Route
              path="/feedback/:id/edit"
              element={
                <EditFeedbackRoute
                  feedback={feedback}
                  onSubmit={saveFeedback}
                  onCancel={() => navigate('/')}
                  saving={saving}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
export default App
