import { useState, useRef, useEffect } from 'react';
import api from '../api';

const CHIPS = [
  { label: '📄 RTI Filing', text: 'What is the RTI Act and how do I file an RTI application?' },
  { label: '⚖️ Section 498A', text: 'Explain Section 498A of the Indian Penal Code' },
  { label: '📋 File an FIR', text: 'How do I file an FIR? What is the procedure?' },
  { label: '🛒 Consumer Rights', text: 'What are my rights under the Consumer Protection Act 2019?' },
  { label: '🔒 POCSO Act', text: 'What is the POCSO Act and what does it cover?' },
  { label: '🏠 Tenant Rights', text: 'What are my rights as a tenant under Indian law?' },
];

const FOLLOWUP_MAP = {
  rti: ['Who can file RTI?', 'What is the RTI fee?', 'Appeal process for RTI'],
  fir: ['Can police refuse FIR?', 'What is a Zero FIR?', 'FIR vs complaint'],
  '498a': ['Is 498A bailable?', 'Can 498A be quashed?', 'Anticipatory bail in 498A'],
  consumer: ['Consumer court fees', 'Time limit to file complaint', 'What is district forum?'],
  pocso: ['Mandatory reporting in POCSO', 'POCSO bail conditions', 'Special courts for POCSO'],
  tenant: ['Notice period for eviction', 'Rent control laws', 'Can landlord enter without notice?'],
};

const EMERGENCY = [
  { name: 'National Emergency', number: '112', icon: '🚨' },
  { name: 'Police', number: '100', icon: '👮' },
  { name: 'Women Helpline', number: '1091', icon: '👩' },
  { name: 'Child Helpline', number: '1098', icon: '🧒' },
  { name: 'Legal Aid', number: '15100', icon: '⚖️' },
  { name: 'Domestic Violence', number: '181', icon: '🏠' },
  { name: 'Cyber Crime', number: '1930', icon: '💻' },
  { name: 'Senior Citizen', number: '14567', icon: '👴' },
];

const detectLang = (text) => {
  if (!text) return 'en';
  const sample = text.slice(0, 200);
  const counts = {
    hi: (sample.match(/[\u0900-\u097F]/g) || []).length,
    bn: (sample.match(/[\u0980-\u09FF]/g) || []).length,
    ta: (sample.match(/[\u0B80-\u0BFF]/g) || []).length,
    te: (sample.match(/[\u0C00-\u0C7F]/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 5 ? best[0] : 'en';
};

const getVoicesReady = () => new Promise((resolve) => {
  const synth = window.speechSynthesis;
  if (!synth) return resolve([]);
  const v = synth.getVoices();
  if (v.length > 0) return resolve(v);
  const handler = () => { resolve(synth.getVoices()); synth.removeEventListener('voiceschanged', handler); };
  synth.addEventListener('voiceschanged', handler);
  setTimeout(() => resolve(synth.getVoices()), 2000);
});

const pickVoice = (voices, langCode, gender) => {
  const target = { en:'en', hi:'hi', bn:'bn', mr:'mr', ta:'ta', te:'te' }[langCode] || 'en';
  let filtered = voices.filter(v => v.lang.toLowerCase().startsWith(target));
  const isFallback = filtered.length === 0 && langCode !== 'en';
  if (isFallback) filtered = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  if (!filtered.length) filtered = [...voices];
  const preferred = filtered.find(v =>
    gender === 'female'
      ? /female|woman|zira|hazel|susan|heera|kalpana/i.test(v.name)
      : /male|man|david|mark|ravi|hemant/i.test(v.name)
  );
  return { voice: preferred || filtered[0] || null, fallback: isFallback };
};

const chunkText = (text, maxLen = 180) => {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

class TTSManager {
  constructor() { this.speaking = false; this._keepAlive = null; }

  async speak(text, lang = 'en', speed = 1.0, gender = 'female', onStart, onEnd) {
    this.stop();
    if (!window.speechSynthesis || !text) return 'ok';
    const voices = await getVoicesReady();
    const { voice, fallback } = pickVoice(voices, lang, gender);
    if (fallback) return 'no_voice';
    const chunks = chunkText(text);
    if (!chunks.length) return 'ok';
    this.speaking = true;
    onStart?.();
    let i = 0;
    const langBCP = { en:'en-IN', hi:'hi-IN', bn:'bn-IN', mr:'mr-IN', ta:'ta-IN', te:'te-IN' };
    const speakNext = () => {
      if (i >= chunks.length || !this.speaking) {
        this.speaking = false; clearInterval(this._keepAlive); onEnd?.(); return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang = langBCP[lang] || 'en-IN';
      u.rate = Math.min(Math.max(speed, 0.5), 2.0);
      if (voice) u.voice = voice;
      u.onend = () => { i++; speakNext(); };
      u.onerror = (e) => {
        if (e.error !== 'interrupted') console.warn('TTS error:', e.error);
        this.speaking = false; clearInterval(this._keepAlive); onEnd?.();
      };
      window.speechSynthesis.speak(u);
    };
    this._keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);
    speakNext();
    return 'ok';
  }

  stop() {
    this.speaking = false; clearInterval(this._keepAlive); window.speechSynthesis?.cancel();
  }
}

const ttsManager = new TTSManager();

function EnableAudioModal({ onEnable, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:28, maxWidth:360, width:'90%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔊</div>
        <div style={{ fontSize:17, fontWeight:700, marginBottom:8, color:'var(--text)' }}>Enable Audio?</div>
        <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:24 }}>
          Text-to-speech is currently off.<br />Turn it on to hear NyayBot read replies aloud in your language.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px 0', borderRadius:8, border:'1px solid var(--border)', color:'var(--text2)', fontSize:14, cursor:'pointer', background:'none' }}>Not now</button>
          <button onClick={onEnable} style={{ flex:1, padding:'10px 0', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>Enable Audio</button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ user, theme, onToggleTheme, onOpenSettings, onLogout, onUserUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState('');
  const [speaking, setSpeaking] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [rateLimitWarn, setRateLimitWarn] = useState(false);
  const [streamingIdx, setStreamingIdx] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showEnableAudio, setShowEnableAudio] = useState(false);
  const [pendingReadText, setPendingReadText] = useState(null);
  const [pendingReadIdx, setPendingReadIdx] = useState(null);
  const [ttsToast, setTtsToast] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState('');
  const [docAnalyzing, setDocAnalyzing] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const ttsEnabled  = user.preferences?.ttsEnabled ?? false;
  const ttsAutoRead = user.preferences?.ttsAutoRead ?? false;
  const ttsSpeed    = user.preferences?.ttsSpeed ?? 1.0;
  const ttsGender   = user.preferences?.ttsVoiceGender ?? 'female';
  const language    = user.preferences?.language || 'en';
  const fontSize    = user.preferences?.fontSize || 15;

  useEffect(() => { loadChatHistory(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (ttsEnabled && pendingReadText !== null) {
      const text = pendingReadText;
      const idx = pendingReadIdx;
      setPendingReadText(null);
      setPendingReadIdx(null);
      setTimeout(async () => {
        const result = await ttsManager.speak(text, detectLang(text), ttsSpeed, ttsGender,
          () => setSpeaking(idx), () => setSpeaking(null));
        if (result === 'no_voice') showNoVoiceToast();
      }, 300);
    }
  }, [ttsEnabled]);

  const loadChatHistory = async () => {
    try { const { data } = await api.get('/chat/history'); setChatHistory(data); } catch (e) {}
  };

  const newChat = () => {
    ttsManager.stop(); setSpeaking(null);
    setMessages([]); setChatId(null); setChatTitle('New Chat');
    inputRef.current?.focus();
  };

  const loadChat = async (id, title) => {
    try {
      ttsManager.stop(); setSpeaking(null);
      const { data } = await api.get(`/chat/${id}`);
      setMessages(data.messages.map(m => ({ role: m.role === 'assistant' ? 'bot' : m.role, text: m.content })));
      setChatId(id); setChatTitle(title);
    } catch (e) { alert('Failed to load chat'); }
  };

  const enableAudioNow = async () => {
    setShowEnableAudio(false);
    try {
      const { data } = await api.put('/auth/profile', { preferences: { ttsEnabled: true } });
      onUserUpdate?.(data);
    } catch (e) {
      onUserUpdate?.({ ...user, preferences: { ...user.preferences, ttsEnabled: true } });
    }
  };

  const toggleAudioHeader = async () => {
    const next = !ttsEnabled;
    if (!next) ttsManager.stop();
    try {
      const { data } = await api.put('/auth/profile', { preferences: { ttsEnabled: next } });
      onUserUpdate?.(data);
    } catch (e) {
      onUserUpdate?.({ ...user, preferences: { ...user.preferences, ttsEnabled: next } });
    }
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    ttsManager.stop(); setSpeaking(null);
    setRateLimitWarn(false);

    let botMsgIndex;
    setMessages(prev => { botMsgIndex = prev.length + 1; return [...prev, { role: 'user', text: msg }]; });
    setLoading(true);

    const history = messages.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.text }));

    try {
      const token = localStorage.getItem('nyaybot_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, chatId, history, language }),
      });

      if (res.status === 429) {
        setRateLimitWarn(true);
        setMessages(prev => [...prev, { role: 'bot', text: '⚠️ Rate limit reached. Please wait a moment.' }]);
        setLoading(false); return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, { role: 'bot', text: '❌ Error: ' + (err.message || 'Server error') }]);
        setLoading(false); return;
      }

      setMessages(prev => [...prev, { role: 'bot', text: '', streaming: true }]);
      setStreamingIdx(messages.length + 1);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '', newChatId = chatId, newTitle = chatTitle;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.delta) {
              fullText += parsed.delta;
              setMessages(prev => { const n=[...prev]; n[n.length-1]={role:'bot',text:fullText,streaming:true}; return n; });
            }
            if (parsed.done) { newChatId = parsed.chatId; newTitle = parsed.title; }
            if (parsed.error) { fullText = '❌ ' + parsed.error; }
          } catch (_) {}
        }
      }

      setMessages(prev => { const n=[...prev]; n[n.length-1]={role:'bot',text:fullText}; return n; });
      setStreamingIdx(null);
      if (!chatId) { setChatId(newChatId); setChatTitle(newTitle); }
      loadChatHistory();

      if (ttsEnabled && ttsAutoRead && fullText) {
        const readIdx = botMsgIndex;
        setTimeout(async () => {
          const result = await ttsManager.speak(fullText, detectLang(fullText), ttsSpeed, ttsGender,
            () => setSpeaking(readIdx), () => setSpeaking(null));
          if (result === 'no_voice') showNoVoiceToast();
        }, 400);
      }

    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: '❌ Error: ' + err.message }]);
      setStreamingIdx(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) { alert('Only PDF, DOCX, JPG, and PNG files are supported.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum 10MB.'); return; }
    setDocFile(file); setDocPreview(file.name);
    e.target.value = '';
  };

  const clearDoc = () => { setDocFile(null); setDocPreview(''); };

  const analyzeDocument = async () => {
    if (!docFile || docAnalyzing) return;
    setDocAnalyzing(true);
    const userMsg = `📎 Analyzing document: ${docFile.name}`;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessages(prev => [...prev, { role: 'bot', text: '', streaming: true }]);
    const botIdx = messages.length + 1;
    setStreamingIdx(botIdx);
    setLoading(true);
    clearDoc();

    try {
      const formData = new FormData();
      formData.append('document', docFile);
      formData.append('language', language);
      if (chatId) formData.append('chatId', chatId);

      const token = localStorage.getItem('nyaybot_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/analyze-document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages(prev => { const n=[...prev]; n[n.length-1]={role:'bot',text:'❌ ' + (err.message || 'Could not analyze document')}; return n; });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '', newChatId = chatId, newTitle = chatTitle;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.delta) {
              fullText += parsed.delta;
              setMessages(prev => { const n=[...prev]; n[n.length-1]={role:'bot',text:fullText,streaming:true}; return n; });
            }
            if (parsed.done) { newChatId = parsed.chatId; newTitle = parsed.title; }
            if (parsed.error) { fullText = '❌ ' + parsed.error; }
          } catch (_) {}
        }
      }

      setMessages(prev => { const n=[...prev]; n[n.length-1]={role:'bot',text:fullText}; return n; });
      if (!chatId) { setChatId(newChatId); setChatTitle(newTitle); }
      loadChatHistory();

      if (ttsEnabled && ttsAutoRead && fullText) {
        setTimeout(async () => {
          const result = await ttsManager.speak(fullText, detectLang(fullText), ttsSpeed, ttsGender,
            () => setSpeaking(botIdx), () => setSpeaking(null));
          if (result === 'no_voice') showNoVoiceToast();
        }, 400);
      }
    } catch (err) {
      setMessages(prev => { const n=[...prev]; n[n.length-1]={role:'bot',text:'❌ Error: '+err.message}; return n; });
    } finally {
      setStreamingIdx(null); setLoading(false); setDocAnalyzing(false);
    }
  };

  const toggleMic = () => {
    setMicError('');
    if (micActive) { recognitionRef.current?.stop(); setMicActive(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError('Speech recognition not supported. Use Chrome or Edge.'); return; }
    const isLocal = ['localhost','127.0.0.1'].includes(location.hostname);
    if (location.protocol !== 'https:' && !isLocal) { setMicError('Microphone requires HTTPS or localhost.'); return; }
    const recognition = new SR();
    const langMap = { en:'en-IN', hi:'hi-IN', bn:'bn-IN', mr:'mr-IN', ta:'ta-IN', te:'te-IN' };
    recognition.lang = langMap[language] || 'en-IN';
    recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (e) => { setInput(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript); setMicActive(false); };
    recognition.onerror = (e) => {
      setMicActive(false);
      if (e.error === 'not-allowed') setMicError('Mic blocked — click 🔒 in address bar and allow microphone.');
      else if (e.error === 'no-speech') setMicError('No speech detected. Speak clearly and try again.');
      else setMicError('Mic error: ' + e.error);
    };
    recognition.onend = () => setMicActive(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setMicActive(true); } catch (e) { setMicError('Could not start mic: ' + e.message); }
  };

  const langNames = { hi:'Hindi', bn:'Bengali', mr:'Marathi', ta:'Tamil', te:'Telugu' };
  const showNoVoiceToast = () => {
    const name = langNames[language];
    setTtsToast(`⚠️ Your device doesn't have a ${name} voice installed. Add it in your OS language/speech settings, or switch to English in NyayBot Settings.`);
    setTimeout(() => setTtsToast(''), 8000);
  };

  const toggleTTS = async (text, idx) => {
    if (!window.speechSynthesis) { alert('TTS not supported in this browser. Use Chrome or Edge.'); return; }
    if (speaking === idx) { ttsManager.stop(); setSpeaking(null); return; }
    if (!ttsEnabled) { setPendingReadText(text); setPendingReadIdx(idx); setShowEnableAudio(true); return; }
    const result = await ttsManager.speak(text, detectLang(text), ttsSpeed, ttsGender, () => setSpeaking(idx), () => setSpeaking(null));
    if (result === 'no_voice') showNoVoiceToast();
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => { setCopyFeedback(idx); setTimeout(() => setCopyFeedback(null), 2000); });
  };

  const bookmarkMessage = async (text, idx) => {
    try {
      await api.post('/auth/bookmarks', { chatId, messageIndex: idx, content: text, note: '' });
      setCopyFeedback('bm_' + idx); setTimeout(() => setCopyFeedback(null), 2000);
    } catch (e) {}
  };

  const getFollowUps = (text) => {
    const t = text.toLowerCase();
    for (const [key, chips] of Object.entries(FOLLOWUP_MAP)) { if (t.includes(key)) return chips; }
    return [];
  };

  const groupedHistory = () => {
    const today = [], yesterday = [], older = [], now = Date.now();
    chatHistory.forEach(c => {
      const diff = (now - new Date(c.updatedAt)) / 86400000;
      if (diff < 1) today.push(c); else if (diff < 2) yesterday.push(c); else older.push(c);
    });
    return { today, yesterday, older };
  };
  const groups = groupedHistory();

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {showEnableAudio && (
        <EnableAudioModal onEnable={enableAudioNow}
          onClose={() => { setShowEnableAudio(false); setPendingReadText(null); setPendingReadIdx(null); }} />
      )}

      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 260 : 0, background:'var(--card)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden', transition:'width .2s' }}>
        <div style={{ padding:16, borderBottom:'1px solid var(--border)', minWidth:260 }}>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--accent)' }}>⚖️ NyayBot</div>
          <button onClick={newChat} style={{ width:'100%', padding:10, background:'var(--accent)', color:'#fff', borderRadius:8, fontSize:14, fontWeight:500, marginTop:12, cursor:'pointer' }}>+ New Chat</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12, minWidth:260 }}>
          {[['Today', groups.today], ['Yesterday', groups.yesterday], ['Older', groups.older]].map(([label, items]) =>
            items.length > 0 && (
              <div key={label} style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:6, padding:'0 4px' }}>{label}</div>
                {items.map(c => (
                  <div key={c._id} onClick={() => loadChat(c._id, c.title)}
                    style={{ padding:'8px 10px', borderRadius:6, fontSize:13, color: chatId===c._id ? 'var(--accent)' : 'var(--text2)', background: chatId===c._id ? 'var(--card2)' : 'transparent', cursor:'pointer', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'.15s' }}>
                    💬 {c.title}
                  </div>
                ))}
              </div>
            )
          )}
          {chatHistory.length === 0 && <div style={{ fontSize:13, color:'var(--text3)', padding:8 }}>No chats yet.</div>}
        </div>
        <div style={{ padding:14, borderTop:'1px solid var(--border)', minWidth:260 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:6 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden' }}>
              {user.profilePhoto ? <img src={user.profilePhoto} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            <button onClick={onOpenSettings} style={{ flex:1, padding:'6px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--text2)', cursor:'pointer' }}>⚙ Settings</button>
            <button onClick={onLogout} style={{ padding:'6px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--text2)', cursor:'pointer' }}>↩</button>
          </div>
        </div>
      </div>

      {/* MAIN CHAT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--card)', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ width:30, height:30, borderRadius:6, border:'1px solid var(--border)', color:'var(--text2)', fontSize:16, cursor:'pointer' }}>☰</button>
            <div style={{ fontSize:14, fontWeight:600, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chatTitle}</div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
            <button onClick={toggleAudioHeader} title={ttsEnabled ? 'Audio ON' : 'Audio OFF'}
              style={{ padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer', border:`1px solid ${ttsEnabled ? 'var(--accent)' : 'var(--border)'}`, color: ttsEnabled ? 'var(--accent)' : 'var(--text3)', background: ttsEnabled ? 'rgba(0,201,167,0.08)' : 'none', fontWeight: ttsEnabled ? 600 : 400, transition:'all .2s' }}>
              {ttsEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}
            </button>
            <button onClick={() => setShowEmergency(e => !e)} style={{ padding:'5px 12px', border:'1px solid var(--danger)', borderRadius:20, fontSize:12, color:'var(--danger)', fontWeight:500, cursor:'pointer' }}>🆘 Emergency</button>
            <button onClick={onToggleTheme} style={{ padding:'5px 12px', border:'1px solid var(--border)', borderRadius:20, fontSize:12, color:'var(--text2)', cursor:'pointer' }}>{theme === 'dark' ? '☀' : '🌙'}</button>
          </div>
        </div>

        {ttsToast && (
          <div style={{ background:'rgba(255,180,0,.1)', border:'1px solid #c8a000', borderRadius:8, margin:'8px 16px', padding:'8px 14px', fontSize:13, color:'#c8a000', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {ttsToast}
            <button onClick={() => setTtsToast('')} style={{ color:'#c8a000', fontSize:16, cursor:'pointer', marginLeft:8 }}>×</button>
          </div>
        )}
        {micError && (
          <div style={{ background:'rgba(224,92,92,.1)', border:'1px solid var(--danger)', borderRadius:8, margin:'8px 16px', padding:'8px 14px', fontSize:13, color:'var(--danger)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            🎙 {micError}
            <button onClick={() => setMicError('')} style={{ color:'var(--danger)', fontSize:16, cursor:'pointer' }}>×</button>
          </div>
        )}
        {rateLimitWarn && (
          <div style={{ background:'rgba(224,92,92,.1)', border:'1px solid var(--danger)', borderRadius:8, margin:'8px 16px', padding:'8px 14px', fontSize:13, color:'var(--danger)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            ⚠️ Rate limit reached — wait a moment before sending again.
            <button onClick={() => setRateLimitWarn(false)} style={{ color:'var(--danger)', fontSize:16, cursor:'pointer' }}>×</button>
          </div>
        )}
        {showEmergency && (
          <div style={{ background:'var(--card2)', borderBottom:'1px solid var(--border)', padding:'12px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--danger)', marginBottom:10 }}>🆘 Emergency Helplines (India)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {EMERGENCY.map(e => (
                <a key={e.number} href={`tel:${e.number}`}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)', textDecoration:'none' }}>
                  <span>{e.icon}</span>
                  <div><div style={{ fontWeight:500 }}>{e.name}</div><div style={{ color:'var(--accent)', fontWeight:700 }}>{e.number}</div></div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:14, fontSize }}>
          {messages.length === 0 && (
            <>
              <div style={{ background:'var(--bot-bubble)', borderRadius:12, padding:20, maxWidth:680 }} className="msg-appear">
                <div style={{ fontSize:16, fontWeight:600, color:'var(--accent)', marginBottom:8 }}>नमस्ते! I am NyayBot 🙏</div>
                <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6 }}>
                  I help you understand Indian laws and your legal rights. Ask me about IPC sections, RTI, consumer rights, domestic violence laws, labour law, property rights, family law, or cyber crime.
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {CHIPS.map(c => (
                  <button key={c.label} onClick={() => sendMessage(c.text)}
                    style={{ padding:'7px 14px', background:'var(--card2)', border:'1px solid var(--border)', borderRadius:20, fontSize:13, color:'var(--text2)', cursor:'pointer' }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((m, i) => {
            const isBot = m.role === 'bot';
            const isSpeaking = speaking === i;
            const followUps = isBot && !m.streaming ? getFollowUps(m.text) : [];
            return (
              <div key={i} className="msg-appear" style={{ display:'flex', flexDirection:'column', alignItems: isBot ? 'flex-start' : 'flex-end', gap:4 }}>
                <div style={{ maxWidth:'78%', padding:'11px 15px', borderRadius:12, lineHeight:1.65, background: isBot ? 'var(--bot-bubble)' : 'var(--user-bubble)', color: isBot ? 'var(--text)' : '#fff', borderBottomRightRadius: !isBot ? 3 : 12, borderBottomLeftRadius: isBot ? 3 : 12, whiteSpace:'pre-wrap', wordBreak:'break-word', boxShadow: isSpeaking ? '0 0 0 2px var(--accent)' : 'none', transition:'box-shadow .2s' }}>
                  {m.text}
                  {m.streaming && <span style={{ animation:'pulse 1s infinite', marginLeft:4 }}>▋</span>}
                </div>
                {isBot && !m.streaming && m.text && (
                  <div style={{ display:'flex', gap:4, padding:'0 2px', flexWrap:'wrap' }}>
                    <button onClick={() => copyMessage(m.text, i)} style={{ padding:'3px 8px', borderRadius:5, border:'1px solid var(--border)', fontSize:11, color:'var(--text3)', background:'var(--card2)', cursor:'pointer' }}>
                      {copyFeedback === i ? '✅ Copied' : '📋 Copy'}
                    </button>
                    <button onClick={() => bookmarkMessage(m.text, i)} style={{ padding:'3px 8px', borderRadius:5, border:'1px solid var(--border)', fontSize:11, color:'var(--text3)', background:'var(--card2)', cursor:'pointer' }}>
                      {copyFeedback === 'bm_'+i ? '✅ Saved' : '🔖 Save'}
                    </button>
                    <button onClick={() => toggleTTS(m.text, i)} style={{ padding:'3px 8px', borderRadius:5, fontSize:11, cursor:'pointer', border:`1px solid ${isSpeaking ? 'var(--accent)' : 'var(--border)'}`, color: isSpeaking ? 'var(--accent)' : 'var(--text3)', background:'var(--card2)', fontWeight: isSpeaking ? 600 : 400 }}>
                      {isSpeaking ? '⏹ Stop' : '🔊 Read'}
                    </button>
                    <div style={{ fontSize:11, color:'var(--text3)', padding:'3px 4px', alignSelf:'center' }}>General info — not legal advice</div>
                  </div>
                )}
                {followUps.length > 0 && i === messages.length - 1 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                    {followUps.map(f => (
                      <button key={f} onClick={() => sendMessage(f)} style={{ padding:'5px 12px', background:'var(--card2)', border:'1px solid var(--border)', borderRadius:16, fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && streamingIdx === null && (
            <div style={{ display:'flex', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:5, alignItems:'center', padding:'11px 15px', background:'var(--bot-bubble)', borderRadius:12 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--text3)', animation:'bounce .8s infinite', animationDelay:`${i*.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding:'14px 16px', borderTop:'1px solid var(--border)', background:'var(--card)' }}>
          {docPreview && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', marginBottom:8, fontSize:13 }}>
              <span>📎</span>
              <span style={{ flex:1, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{docPreview}</span>
              <button onClick={analyzeDocument} disabled={docAnalyzing || loading} style={{ padding:'4px 12px', borderRadius:6, border:'none', background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', opacity:(docAnalyzing||loading)?.5:1 }}>
                {docAnalyzing ? 'Analyzing…' : 'Analyze'}
              </button>
              <button onClick={clearDoc} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:16, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} style={{ display:'none' }} />
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, background:'var(--card2)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px' }}>
            <button onClick={() => fileInputRef.current?.click()} title="Attach document (PDF, DOCX, Image)"
              style={{ width:32, height:32, borderRadius:7, border:'1px solid var(--border)', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16, background:'none', cursor:'pointer' }}>
              📎
            </button>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask about any Indian law, right, or legal procedure..."
              rows={1} style={{ flex:1, background:'none', border:'none', color:'var(--text)', fontSize:14, resize:'none', outline:'none', maxHeight:120, lineHeight:1.5 }}
              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }}
            />
            <button onClick={toggleMic} title={micActive ? 'Stop recording' : 'Voice input'}
              style={{ width:32, height:32, borderRadius:7, border:`1px solid ${micActive?'var(--danger)':'var(--border)'}`, color: micActive?'var(--danger)':'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:15, background: micActive ? 'rgba(224,92,92,.1)' : 'none', cursor:'pointer' }}>
              {micActive ? '⏹' : '🎙'}
            </button>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width:32, height:32, borderRadius:7, background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:(!input.trim()||loading)?.4:1, fontSize:14, cursor:'pointer' }}>
              ➤
            </button>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:6 }}>
            NyayBot provides general legal information only — consult a lawyer for your situation
          </div>
        </div>
      </div>
    </div>
  );
}