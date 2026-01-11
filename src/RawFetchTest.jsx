import React, { useEffect, useState } from 'react';

export default function RawFetchTest() {
  const [result, setResult] = useState('Testing...');

  useEffect(() => {
    const test = async () => {
      try {
        const url = process.env.REACT_APP_API_URL || 'https://portal-be.paicc.tech';
        const fullUrl = url + '/api/jobs';

        console.log('🔍 RAW FETCH TEST');
        console.log('URL:', fullUrl);
        console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const text = await response.text();
        console.log('Response text length:', text.length);

        try {
          const data = JSON.parse(text);
          console.log('Parsed data:', data);
          setResult(`✅ SUCCESS!\nStatus: ${response.status}\nJobs: ${data.count}\n\nResponse: ${JSON.stringify(data).substring(0, 200)}...`);
        } catch (e) {
          console.log('Parse error:', e);
          setResult(`Error parsing JSON:\n${text.substring(0, 500)}`);
        }
      } catch (error) {
        console.error('❌ FETCH ERROR:', error);
        setResult(`❌ FETCH ERROR:\n${error.message}\n\n${JSON.stringify(error, null, 2)}`);
      }
    };

    test();
  }, []);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'monospace',
      background: '#1e1e1e',
      color: '#d4d4d4',
      border: '3px solid #ff6b6b',
      margin: '10px',
      borderRadius: '8px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <h3 style={{ color: '#ff6b6b' }}>🔍 RAW FETCH TEST</h3>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {result}
      </pre>
    </div>
  );
}
