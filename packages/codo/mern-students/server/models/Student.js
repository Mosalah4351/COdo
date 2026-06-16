const mongoose = require("mongoose")

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  course: { type: String, required: true },
}, { timestamps: true })

module.exports = mongoose.model("Student", studentSchema)
