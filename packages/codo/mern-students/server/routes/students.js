const express = require("express")
const Student = require("../models/Student")

const router = express.Router()

router.get("/", async (req, res, next) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 })
    res.json(students)
  } catch (err) {
    next(err)
  }
})

router.get("/:id", async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
    if (!student) return res.status(404).json({ message: "Student not found" })
    res.json(student)
  } catch (err) {
    next(err)
  }
})

router.post("/", async (req, res, next) => {
  try {
    const student = new Student(req.body)
    const saved = await student.save()
    res.status(201).json(saved)
  } catch (err) {
    next(err)
  }
})

router.put("/:id", async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!student) return res.status(404).json({ message: "Student not found" })
    res.json(student)
  } catch (err) {
    next(err)
  }
})

router.delete("/:id", async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id)
    if (!student) return res.status(404).json({ message: "Student not found" })
    res.json({ message: "Student deleted" })
  } catch (err) {
    next(err)
  }
})

module.exports = router
