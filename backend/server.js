const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const dotenv = require('dotenv')
const path = require('path')
dotenv.config({ path: path.join(__dirname, '.env') })
const app = express()
const port = Number(process.env.PORT) || 5000
const mongoUri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB_NAME || 'course_feedback'
let client
app.use(express.json({ limit: '16kb' }))
function validateFeedback(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A feedback object is required.'
  }
  const courseName = typeof body.courseName === 'string' ? body.courseName.trim() : ''
  const duration = typeof body.duration === 'string' ? body.duration.trim() : ''
  const comments = typeof body.comments === 'string' ? body.comments.trim() : ''
  const rating = Number(body.rating)

  if (!courseName || courseName.length > 120) {
    return 'Course name is required and must be 120 characters or fewer.'
  }
  if (!duration || duration.length > 40) {
    return 'Course duration is required and must be 40 characters or fewer.'
  }
  if (!comments || comments.length > 1000) {
    return 'Feedback comments are required and must be 1000 characters or fewer.'
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Feedback rating must be a whole number from 1 to 5.'
  }
  return { courseName, duration, comments, rating }
}
function serializeFeedback(document) {
  return {
    id: document._id.toString(),
    courseId: document.courseId,
    courseName: document.courseName,
    duration: document.duration,
    comments: document.comments,
    rating: document.rating,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/feedback', async (req, res, next) => {
  try {
    const feedback = await client
      .db(databaseName)
      .collection('feedback')
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray()

    res.json(feedback.map(serializeFeedback))
  } catch (error) {
    next(error)
  }
})
app.post('/api/feedback', async (req, res, next) => {
  try {
    const input = validateFeedback(req.body)
    if (typeof input === 'string') {
      return res.status(400).json({ error: input })
    }
    const now = new Date()
    const document = {
      ...input,
      courseId: `CRS-${new ObjectId().toString().toUpperCase()}`,
      createdAt: now,
      updatedAt: now,
    }
    const result = await client.db(databaseName).collection('feedback').insertOne(document)
    res.status(201).json(serializeFeedback({ ...document, _id: result.insertedId }))
  } catch (error) {
    next(error)
  }
})

app.put('/api/feedback/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Feedback ID is invalid.' })
    }

    const input = validateFeedback(req.body)
    if (typeof input === 'string') {
      return res.status(400).json({ error: input })
    }

    const _id = new ObjectId(req.params.id)
    const updatedAt = new Date()
    const result = await client
      .db(databaseName)
      .collection('feedback')
      .findOneAndUpdate(
        { _id },
        { $set: { ...input, updatedAt } },
        { returnDocument: 'after' },
      )

    if (!result) {
      return res.status(404).json({ error: 'Feedback was not found.' })
    }
    res.json(serializeFeedback(result))
  } catch (error) {
    next(error)
  }
})
app.delete('/api/feedback/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Feedback ID is invalid.' })
    }

    const result = await client
      .db(databaseName)
      .collection('feedback')
      .deleteOne({ _id: new ObjectId(req.params.id) })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Feedback was not found.' })
    }
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  const status = Number.isInteger(error.status) ? error.status : 500
  if (status >= 500) {
    console.error('API request failed:', error)
  }
  const message =
    error.type === 'entity.parse.failed'
      ? 'Request body must contain valid JSON.'
      : status === 413
        ? 'Request body is too large.'
        : status >= 500
          ? 'The server could not complete the request.'
          : error.message
  res.status(status).json({ error: message })
})
async function startServer() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required. Set it in backend/.env before starting the API.')
  }
  client = new MongoClient(mongoUri)
  await client.connect()
  app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`)
  })
}
startServer().catch(async (error) => {
  console.error('Could not start the course feedback API:', error.message)
  if (client) await client.close()
  process.exitCode = 1
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (client) await client.close()
    process.exit(0)
  })
}
