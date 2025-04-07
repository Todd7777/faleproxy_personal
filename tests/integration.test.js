const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
let server;
let mockServer;

describe('Integration Tests', () => {
  // Modify the app to use a test port
  beforeAll(async () => {
    // Create a mock server to serve the sample HTML
    mockServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(sampleHtmlWithYale);
    }).listen(3100);
    
    // Allow local connections
    nock.cleanAll();
    nock.enableNetConnect();
    
    // Create a temporary test app file
    try {
      // Read the original app.js
      const appContent = fs.readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
      
      // Replace the port
      const modifiedContent = appContent.replace('const PORT = 3001', `const PORT = ${TEST_PORT}`);
      
      // Write to a new file
      fs.writeFileSync(path.join(process.cwd(), 'app.test.js'), modifiedContent, 'utf8');
      
      // Start the test server
      server = require('child_process').spawn('node', ['app.test.js'], {
        detached: true,
        stdio: 'ignore'
      });
      
      // Give the server time to start
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error setting up test server:', error);
      throw error;
    }
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    // Kill the test server and clean up
    if (server && server.pid) {
      try {
        process.kill(-server.pid);
      } catch (error) {
        console.error('Error killing server:', error);
      }
    }
    
    if (mockServer) {
      try {
        mockServer.close();
      } catch (error) {
        console.error('Error closing mock server:', error);
      }
    }
    
    // Remove the test file
    try {
      fs.unlinkSync(path.join(process.cwd(), 'app.test.js'));
    } catch (error) {
      console.error('Error removing test file:', error);
    }
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Make a request to our proxy app using our mock server
    const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
      url: 'http://localhost:3100'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.data.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');
    
    // Verify URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);
    
    // Verify link text is changed
    expect($('a').first().text()).toBe('About Fale');
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'not-a-valid-url'
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(500);
    }
  });

  test('Should handle missing URL parameter', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('URL is required');
    }
  });
});
