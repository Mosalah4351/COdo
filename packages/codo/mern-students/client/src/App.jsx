import { Routes, Route, NavLink } from "react-router-dom"
import StudentList from "./components/StudentList"
import StudentForm from "./components/StudentForm"

export default function App() {
  return (
    <div className="container">
      <h1>Student Manager</h1>
      <nav className="nav">
        <NavLink to="/">All Students</NavLink>
        <NavLink to="/add">Add Student</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<StudentList />} />
        <Route path="/add" element={<StudentForm />} />
        <Route path="/edit/:id" element={<StudentForm />} />
      </Routes>
    </div>
  )
}
