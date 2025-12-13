// test-server.js - Temporary test to bypass environment issues
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// HARDCODE YOUR SUPABASE VALUES HERE
const SUPABASE_URL = 'https://aaueomdegferrqeqsbzm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdWVvbWRlZ2ZlcnJxZXFzYnptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIwMzAzOCwiZXhwIjoyMDgwNzc5MDM4fQ.6YeVlUhhqGB3eb7_V3bFRRg1eatCYE7jMccHStqhvQY';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdWVvbWRlZ2ZlcnJxZXFzYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMwMzgsImV4cCI6MjA4MDc3OTAzOH0.-7gaEOKYScnhJG-DUlmWwCnjRPVn0cFQgTBmohlLy3o';

console.log('🔧 Using hardcoded Supabase config for testing');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Test server is running',
    timestamp: new Date().toISOString(),
    environment: 'test'
  });
});

// Test Supabase connection
app.get('/api/test-supabase', async (req, res) => {
  try {
    // Dynamically import to avoid ES module issues
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data, error } = await supabase
      .from('quotes')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Supabase connection successful',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    environment: process.env.NODE_ENV || 'unknown',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 TEST SERVER STARTED
=========================================
✅ Port: ${PORT}
✅ Test endpoints:
   - GET /api/health
   - GET /api/test
   - GET /api/test-supabase
=========================================
  `);
});
