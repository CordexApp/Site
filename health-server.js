const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

app.get('/health', (req, res) => {
  res.json({ message: 'Service is healthy' });
});

// Handle POST to root endpoint (this is what the client is actually using)
app.post('/', (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' field in request body" });
    }
    
    console.log('Processing query:', query);
    
    // Process the query and return a response
    // For now, just echo the query as a demo
    res.json({ 
      response: `You sent: ${query}. This is a response from your test server.` 
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: "Failed to process query" });
  }
});

app.post('/api/prompt', (req, res) => {
  try {
    console.log('Received prompt request:', req.body);
    // Process the prompt here
    res.json({ response: "This is a test response from your health server" });
  } catch (error) {
    console.error('Error processing prompt:', error);
    res.status(500).json({ error: "Failed to process prompt" });
  }
});

// Add a catch-all route for debugging missing endpoints
app.all('*', (req, res) => {
  console.log(`Received request to unknown endpoint: ${req.method} ${req.url}`);
  res.status(200).json({ 
    response: "Caught by catch-all route handler",
    method: req.method,
    url: req.url,
    body: req.body
  });
});

app.listen(PORT, () => {
  console.log(`Health API running on http://localhost:${PORT}/health`);
  console.log(`API prompt endpoint available at http://localhost:${PORT}/api/prompt`);
  console.log(`Root endpoint handler for queries added`);
  console.log(`Server is now also logging all incoming requests`);
}); 