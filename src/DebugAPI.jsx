import React, { useEffect, useState } from 'react';

export default function DebugAPI() {
  const [status, setStatus] = useState('Loading...');
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const testAPI = async () => {
      try {
        const url = process.env.REACT_APP_API_URL || 'https://pvara-backend.fortanixor.com';
        setApiUrl(url);

        console.log('🔍 Debug: Testing API at:', url + '/api/jobs');

        const response = await fetch(url + '/api/jobs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok && data.success) {
          setStatus('✅ API is working! Jobs: ' + data.count);
        } else {
          setStatus('❌ API returned error: ' + JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error details:', error);
        setStatus('❌ Error: ' + error.message);
      }
    };

    testAPI();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#f5f5f5', margin: '20px' }}>
      <h3>🔍 API Debug Info</h3>
      <p><strong>API URL:</strong> {apiUrl}</p>
      <p><strong>Status:</strong> {status}</p>
    </div>
  );
}
