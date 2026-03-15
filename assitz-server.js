const http = require('http');
const https = require('https');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const SYSTEM_PROMPT = `You are Assitz, a warm and calm personal AI assistant. You help people with scams, medical questions, legal information and financial guidance. Always be calm, clear and supportive. Start every new conversation with: Thank you for calling Assitz. I am here to help. What is happening right now? Keep responses short and clear. Never diagnose. Never give legal advice. Always say: Assitz provides information only, not professional advice.`;

function askClaude(text) {
  return new Promise(function(resolve) {
    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text || 'Hello' }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content[0].text);
        } catch(e) {
          resolve('Thank you for calling Assitz. I am here to help. What is happening right now?');
        }
      });
    });

    req.on('error', function() {
      resolve('Thank you for calling Assitz. I am here to help. What is happening right now?');
    });

    req.write(body);
    req.end();
  });
}

function parseBody(req) {
  return new Promise(function(resolve) {
    let body = '';
    req.on('data', function(chunk) { body += chunk.toString(); });
    req.on('end', function() {
      const params = {};
      body.split('&').forEach(function(pair) {
        const parts = pair.split('=');
        if (parts.length === 2) {
          params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1].replace(/\+/g, ' '));
        }
      });
      resolve(params);
    });
  });
}

const server = http.createServer(function(req, res) {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Assitz is running');
    return;
  }

  if (req.method === 'POST') {
    parseBody(req).then(function(params) {
      const speech = params['SpeechResult'] || '';
      console.log('Caller said: ' + speech);

      askClaude(speech).then(function(response) {
        console.log('Assitz says: ' + response);

        const safe = response.replace(/&/g, 'and').replace(/</g, '').replace(/>/g, '');

        const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">' + safe + '</Say><Gather input="speech" action="/call" method="POST" timeout="10" speechTimeout="auto"></Gather></Response>';

        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml);
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Assitz running on port ' + PORT);
});

