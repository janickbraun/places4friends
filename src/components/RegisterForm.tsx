"use client";
import React, { useState } from 'react';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = `${window.location.origin}/api/auth/register`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, username }),
      });

      let payload: any = null;
      const text = await res.text();
      try { payload = text ? JSON.parse(text) : null; } catch { payload = { text }; }

      setLoading(false);
      if (!res.ok) {
        const errMsg = payload?.error || payload?.text || `Registration failed (${res.status})`;
        console.error('Registration error response:', payload);
        setMessage(errMsg);
      } else {
        setMessage('Account created — please log in');
        window.location.href = '/login';
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Registration fetch failed:', err);
      setMessage(err?.message || 'Network error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-md">
      <input
        className="w-full p-2 border rounded"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        className="w-full p-2 border rounded"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        required
      />
      <input
        className="w-full p-2 border rounded"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        className="w-full p-2 border rounded"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <input
        className="w-full p-2 border rounded"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
      />
      <button className="px-4 py-2 bg-slate-800 text-white rounded" type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create account'}
      </button>
      {message && <div className="mt-2 text-sm">{message}</div>}
    </form>
  );
}
