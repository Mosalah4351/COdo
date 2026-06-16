import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { createStudent, getStudent, updateStudent } from "../api"

export default function StudentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({ name: "", email: "", age: "", course: "" })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    getStudent(id)
      .then((s) =>
        setForm({ name: s.name, email: s.email, age: String(s.age), course: s.course })
      )
      .catch((err) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    const payload = { ...form, age: Number(form.age) }

    try {
      if (isEdit) {
        await updateStudent(id, payload)
        setMessage({ type: "success", text: "Student updated" })
      } else {
        await createStudent(payload)
        setMessage({ type: "success", text: "Student created" })
        setForm({ name: "", email: "", age: "", course: "" })
      }
      setTimeout(() => navigate("/"), 1200)
    } catch (err) {
      setMessage({ type: "error", text: err.message })
    }
  }

  if (loading) return <p className="empty">Loading...</p>

  return (
    <div className="card">
      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}
      <h2>{isEdit ? "Edit Student" : "Add Student"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Age</label>
          <input
            name="age"
            type="number"
            min="1"
            value={form.age}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Course</label>
          <input
            name="course"
            value={form.course}
            onChange={handleChange}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit">
          {isEdit ? "Update" : "Create"}
        </button>
      </form>
    </div>
  )
}
