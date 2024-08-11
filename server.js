require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const allowedOrigins = ["https://core-team-bootcamp.vercel.app"];
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

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Error: MONGODB_URI is not defined in the environment variables.');
  process.exit(1); // Exit the process with an error code
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch((error) => {
  console.error('Error connecting to MongoDB Atlas:', error.message);
});

// Define the schema and model for 'questions' collection
const questionSchema = new mongoose.Schema({
  title: String,
  description: String,
  option1: String,
  option2: String,
  option3: String,
  option4: String,
  correctAnswer: String
});
const Question = mongoose.model('Question', questionSchema);

// Define the schema and model for 'answers' collection
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
  timestamp: { type: Date, default: Date.now }
});
const Answer = mongoose.model('Answer', answerSchema);

// Define the schema and model for 'memberinfo' collection
const memberInfoSchema = new mongoose.Schema({
  username: { type: String, required: true },
  Designation: { type: String, required: true },
  PhNumber: { type: String, required: true },
  Email: { type: String, required: true },
});
const UserInfo = mongoose.model('MemberInfo', memberInfoSchema);

// Define the schema and model for the 'assessments' collection
const assessmentSchema = new mongoose.Schema({
  username: String,
  file: {
    data: Buffer,
    contentType: String,
    filename: String,
  },
});
const Assessment = mongoose.model('assessments', assessmentSchema);

// Define the schema and model for 'content' collection
const contentSchema = new mongoose.Schema({
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Content = mongoose.model('Content', contentSchema);

// Route to get notifications (data from the 'answers' collection)
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await Answer.find().sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Route to get questions from the 'questions' collection
app.get('/api/reqquestions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Route to post questions to the 'questions' collection
app.post('/api/questions', async (req, res) => {
  try {
    const questions = req.body.questions; // assuming questions are sent as an array

    // Validate the structure of each question
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Invalid questions format. Expected an array of questions.' });
    }

    // Validate each question
    for (const question of questions) {
      const { title, description, option1, option2, option3, option4, correctAnswer } = question;

      if (!title || !description || !option1 || !option2 || !option3 || !option4 || !correctAnswer) {
        return res.status(400).json({ error: 'Each question must include title, description, option1, option2, option3, option4, and correctAnswer.' });
      }
    }

    // Save the questions to the database
    const savedQuestions = await Question.insertMany(questions);

    // Respond with the saved questions
    res.status(201).json(savedQuestions);
  } catch (error) {
    console.error('Error saving questions:', error);
    res.status(500).json({ error: 'Failed to save questions' });
  }
});

// Route to submit user information
app.post('/submit-memberinfo', async (req, res) => {
  const { username, Designation, PhNumber, Email } = req.body;

  const memberInfo = new UserInfo({
    username,
    Designation,
    PhNumber,
    Email
  });

  try {
    await memberInfo.save();
    res.status(201).send('User info saved');
  } catch (error) {
    res.status(400).send('Error saving user info: ' + error.message);
  }
});

// Route to get all PDF files from the 'assessments' collection
app.get('/api/assessments', async (req, res) => {
  try {
    const assessments = await Assessment.find({}, 'username file.filename');
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Route to download a specific PDF file
app.get('/api/assessments/:id', async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).send('File not found');
    }
    res.set({
      'Content-Type': assessment.file.contentType,
      'Content-Disposition': `attachment; filename="${assessment.file.filename}"`,
    });
    res.send(assessment.file.data);
  } catch (error) {
    console.error('Error fetching the file:', error);
    res.status(500).json({ error: 'Failed to fetch the file' });
  }
});

// Route to handle content upload
app.post('/api/uploadContent', async (req, res) => {
  if (req.method === 'POST') {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: 'Content is required' });
      }

      const newContent = new Content({ message });
      const result = await newContent.save();

      return res.status(201).json({ message: 'Content uploaded successfully', result });
    } catch (error) {
      console.error('Error uploading content:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
});

// Export the app for Vercel
module.exports = app;

// Start server locally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
