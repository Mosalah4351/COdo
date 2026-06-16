const API = "/api/students"

export async function getStudents() {
  const res = await fetch(API)
  if (!res.ok) throw new Error("Failed to fetch students")
  return res.json()
}

export async function getStudent(id) {
  const res = await fetch(`${API}/${id}`)
  if (!res.ok) throw new Error("Failed to fetch student")
  return res.json()
}

export async function createStudent(data) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to create student")
  return res.json()
}

export async function updateStudent(id, data) {
  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update student")
  return res.json()
}

export async function deleteStudent(id) {
  const res = await fetch(`${API}/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete student")
  return res.json()
}
