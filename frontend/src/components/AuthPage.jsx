import { useState } from 'react';
import api from '../api';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const s = {
    wrap: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:20 },
    card: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:36, width:'100%', maxWidth:420, boxShadow:'0 8px 40px var(--shadow)' },
    logo: { fontSize:28, fontWeight:800, color:'var(--accent)', textAlign:'center', marginBottom:6 },
    sub: { fontSize:13, color:'var(--text2)', textAlign:'center', marginBottom:28 },
    input: { width:'100%', padding:'11px 14px', background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, outline:'none', marginBottom:12, transition:'border .2s' },
    btn: { width:'100%', padding:12, background:'var(--accent)', color:'#fff', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer', border:'none', marginTop:4 },
    link: { color:'var(--accent)', cursor:'pointer', fontSize:13, textDecoration:'underline' },
    err: { color:'var(--danger)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'rgba(224,92,92,.1)', borderRadius:6 },
    ok: { color:'var(--success)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'rgba(39,174,96,.1)', borderRadius:6 },
  };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.email) return setError('Email is required');

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { data } = await api.post('/auth/forgot-password', { email: form.email });
        setSuccess(data.message + (data.resetLink ? ` Reset link: ${data.resetLink}` : ''));
      } catch (e) {
        setError(e.response?.data?.message || 'Request failed');
      } finally { setLoading(false); }
      return;
    }

    if (!form.password) return setError('Password is required');
    if (mode === 'register' && !form.name) return setError('Name is required');

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('nyaybot_user', JSON.stringify(data));
      onLogin(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>⚖️ NyayBot</div>
        <div style={s.sub}>
          {mode === 'login' && 'AI-powered Indian Legal Assistant'}
          {mode === 'register' && 'Create your free account'}
          {mode === 'forgot' && 'Reset your password'}
        </div>

        {error && <div style={s.err}>{error}</div>}
        {success && <div style={s.ok}>{success}</div>}

        {mode === 'register' && (
          <input style={s.input} placeholder="Full Name" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} />
        )}
        <input style={s.input} type="email" placeholder="Email address" value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
          onKeyDown={e => e.key==='Enter' && handleSubmit()} />
        {mode !== 'forgot' && (
          <input style={s.input} type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            onKeyDown={e => e.key==='Enter' && handleSubmit()} />
        )}

        <button style={{ ...s.btn, opacity: loading ? .6 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
        </button>

        <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:'var(--text2)' }}>
          {mode === 'login' && (
            <>
              <span style={s.link} onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>Forgot password?</span>
              <span style={{ margin:'0 8px' }}>·</span>
              <span>No account? </span>
              <span style={s.link} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register</span>
            </>
          )}
          {mode === 'register' && (
            <>Already have an account? <span style={s.link} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</span></>
          )}
          {mode === 'forgot' && (
            <span style={s.link} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>← Back to Login</span>
          )}
        </div>

        <div style={{ marginTop:20, fontSize:12, color:'var(--text3)', textAlign:'center', lineHeight:1.5 }}>
          NyayBot provides general legal information only.<br />Not a substitute for a qualified lawyer.
        </div>
      </div>
    </div>
  );
}
