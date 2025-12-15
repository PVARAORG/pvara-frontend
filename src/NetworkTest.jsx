import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function NetworkTest() {
  const [status, setStatus] = useState('Testing...');
  const [details, setDetails] = useState('');

  useEffect(() => {
    const test = async () => {
      try {
        const url = process.env.REACT_APP_API_URL || 'http://localhost:6080';
        const fullUrl = url + '/api/jobs';

        console.log('Testing URL:', fullUrl);
        setDetails(`Testing: ${fullUrl}`);

        const response = await axios.get(fullUrl, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Success! Response:', response.data);
        setStatus('✅ Connection OK');
        setDetails(`Success! Got ${response.data.count} jobs`);
      } catch (error) {
        console.error('❌ Error:', error);
        setStatus('❌ Error: ' + (error.message || 'Unknown'));
        setDetails(JSON.stringify({
          message: error.message,
          code: error.code,
          response: error.response?.status,
          url: error.config?.url
        }, null, 2));
      }
    };

    test();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#f0f0f0', border: '2px solid #333', margin: '10px' }}>
      <h3>Network Test</h3>
      <p><strong>Status:</strong> {status}</p>
      <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
        {details}
      </pre>
    </div>
  );
}
