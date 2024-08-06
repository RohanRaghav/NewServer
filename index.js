const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const allowedOrigins = ['https://BootCamp.vercel.app', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// MongoDB connection
mongoose.connect('mongodb+srv://rohanraghav91:rohanraghav@cluster1.up4eqhl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch((error) => {
  console.error('Error connecting to MongoDB Atlas:', error.message);
});

// Define schemas and models
const userInfoSchema = new mongoose.Schema({
  username: { type: String, required: true },
  UID: { type: String, required: true },
  course: { type: String, required: true },
  Department: { type: String, required: true },
  Year: { type: Number, required: true },
  PhNumber: { type: String, required: true },
  Email: { type: String, required: true },
});

const UserInfo = mongoose.model('UserInfo', userInfoSchema);

const questionSchema = new mongoose.Schema({
  title: String,
  description: String,
});

const Question = mongoose.model('Question', questionSchema);

const answerSchema = new mongoose.Schema({
  questionTitle: String,
  answer: String,
  timeTaken: Number,
  username: String,
  UID: String,
  course: String,
  Department: String,
  Year: Number,
  PhNumber: String,
});

const Answer = mongoose.model('Answer', answerSchema);

const feedbackSchema = new mongoose.Schema({
  username: String,
  UID: String,
  course: String,
  feedback: String,
  rating: Number,
  Department: String,
  Year: Number,
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

const contentSchema = new mongoose.Schema({
  message: String,
  timestamp: Date,
});

const Content = mongoose.model('Content', contentSchema);

const assessmentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  UID: { type: String, required: true },
  day: { type: Number, required: true },
  filePath: { type: String }, // Added filePath field
  timestamp: { type: Date, default: Date.now },
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

// Routes
app.post('/upload-assessment', upload.single('file'), async (req, res) => {
  const { username, UID, course, year, day } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const assessment = new Assessment({
      username,
      UID,
      course,
      year,
      day,
      filePath: file.path,
    });

    await assessment.save();
    res.send('Assessment submitted successfully!');
  } catch (error) {
    res.status(500).send('Error submitting assessment: ' + error.message);
  }
});

app.get('/assessment/:id', async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).send('Assessment not found');
    }

    res.sendFile(path.join(__dirname, assessment.filePath));
  } catch (error) {
    res.status(500).send('Error retrieving file: ' + error.message);
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).send('Error fetching questions: ' + error.message);
  }
});

app.post('/submit-test', async (req, res) => {
  console.log('Received request body:', req.body);
  const { username, UID, course, Department, answers, Year } = req.body;

  const answerDocuments = answers.map((answer) => ({
    ...answer,
    username,
    UID,
    course,
    Department,
    Year,
  }));

  try {
    await Answer.insertMany(answerDocuments);
    res.status(201).send('Test submitted successfully!');
  } catch (error) {
    res.status(400).send('Error submitting test: ' + error.message);
  }
});

app.post('/submit-feedback', async (req, res) => {
  const { username, UID, course, feedback, rating, Department, Year } = req.body;

  const feedbackDocument = new Feedback({
    username,
    UID,
    course,
    feedback,
    rating,
    Department,
    Year,
  });

  try {
    await feedbackDocument.save();
    res.status(201).send('Feedback submitted successfully!');
  } catch (error) {
    res.status(400).send('Error submitting feedback: ' + error.message);
  }
});

app.post('/submit-info', async (req, res) => {
  const { username, UID, course, Department, Year, PhNumber, Email, day } = req.body;

  const userInfo = new UserInfo({
    username,
    UID,
    course,
    Department,
    Year,
    PhNumber,
    Email,
    day,
  });

  try {
    await userInfo.save();
    res.status(201).send('User info saved');
  } catch (error) {
    res.status(400).send('Error saving user info: ' + error.message);
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await Content.find().sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
