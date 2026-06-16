require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const studentRoutes = require("./routes/students")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/students", studentRoutes)

app.use((err, req, res, next) => {
  const status = err.status || 500
  res.status(status).json({ message: err.message || "Server Error" })
})

const PORT = process.env.PORT || 5000

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB")
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message)
    process.exit(1)
  })
