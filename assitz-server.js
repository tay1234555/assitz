const http = require('http');
const https = require('https');

function askClaude(text) {
  return new Promise(function(resolve) {
    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      system: 'You are Assitz, a helpful AI assistant. Help people identify scams and answer questions. Be warm and brief. Start with: Thank you for calling Assitz. I am here to help.',
      messages: [{ role: 'user', content: text || 'Hello' }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try {
          resolve(JSON.parse(data).content[0].text);
        } catch(e) {
          resolve('Thank you for calling Assitz. I am here to help. What is happening?');
        }
      });
    });

    req.on('error', function() {
      resolve('Thank you for calling Assitz. I am here to help. What is happening?');
    });

    req.write(body);
    req.end();
  });
}

const server = http.createServer(function(req, res) {
  let body = '';
  
  req.on('data', function(chunk) { 
    body += chunk.toString(); 
  });
  
  req.on('end', function() {
    if (req.method === 'GET') {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Assitz is running');
      return;
    }

    const params = {};
    body.split('&').forEach(function(pair) {
      const p = pair.split('=');
      if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });

    const speech = params['SpeechResult'] || 'Hello';
    console.log('Heard: ' + speech);

    askClaude(speech).then(function(reply) {
      console.log('Reply: ' + reply);
      const safe = reply.replace(/[<>&]/g, ' ');
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">' + safe + '</Say><Gather input="speech" action="/call" method="POST" timeout="10" speechTimeout="auto"></Gather></Response>';
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml);
    }).catch(function() {
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling Assitz. Please call again.</Say></Response>';
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml);
    });
  });
});

server.listen(process.env.PORT || 3000, function() {
  console.log('Assitz running on port ' + (process.env.PORT || 3000));
});
