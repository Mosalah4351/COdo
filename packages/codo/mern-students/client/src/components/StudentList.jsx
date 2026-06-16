import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getStudents, deleteStudent } from "../api"

export default function StudentList() {
  const [students, setStudents] = useState([])
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    try {
      const data = await getStudents()
      setStudents(data)
    } catch (err) {
      setMessage({ type: "error", text: err.message })
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this student?")) return
    try {
      await deleteStudent(id)
      setMessage({ type: "success", text: "Student deleted" })
      setStudents((prev) => prev.filter((s) => s._id !== id))
    } catch (err) {
      setMessage({ type: "error", text: err.message })
    }
  }

  return (
    <div className="card">
      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}
      <h2>All Students</h2>
      {students.length === 0 ? (
        <p className="empty">No students found. Add one!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Age</th>
              <th>Course</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.age}</td>
                <td>{s.course}</td>
                <td>
                  <div className="actions">
                    <Link to={`/edit/${s._id}`} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(s._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
