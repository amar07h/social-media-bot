'use client';
import { useState } from 'react';

export default function Home() {
  const [result, setResult] = useState('');

  const handleCreate = async () => {
    const res = await fetch('/api/create');
    const data = await res.json();
    if (data.success) {
      setResult(`✅ Created: ${data.name} (${data.email})`);
    } else {
      setResult('❌ Failed to create account');
    }
  };

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">Instagram Account Creator</h1>
      <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded">
        Create Account
      </button>
      <p className="mt-4">{result}</p>
    </main>
  );
}
