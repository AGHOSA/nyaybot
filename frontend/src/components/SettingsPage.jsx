import { useState, useEffect, useRef } from 'react';
import api from '../api';

const LANG_DATA = {
  en: { flag:'🇮🇳', name:'English', script:'English', preview:'NyayBot is ready to answer your legal questions in English.', ttsLang:'en-IN' },
  hi: { flag:'🇮🇳', name:'Hindi', script:'हिन्दी', preview:'न्यायबोट आपके कानूनी सवालों का जवाब हिंदी में देगा।', ttsLang:'hi-IN' },
  bn: { flag:'🇧🇩', name:'Bengali', script:'বাংলা', preview:'NyayBot আপনার আইনি প্রশ্নের উত্তর বাংলায় দেবে।', ttsLang:'bn-IN' },
  mr: { flag:'🇮🇳', name:'Marathi', script:'मराठी', preview:'न्यायबोट तुमच्या कायदेशीर प्रश्नांची उत्तरे मराठीत देईल।', ttsLang:'mr-IN' },
  ta: { flag:'🇮🇳', name:'Tamil', script:'தமிழ்', preview:'NyayBot உங்கள் சட்ட கேள்விகளுக்கு தமிழில் பதிலளிக்கும்.', ttsLang:'ta-IN' },
  te: { flag:'🇮🇳', name:'Telugu', script:'తెలుగు', preview:'NyayBot మీ చట్టపరమైన ప్రశ్నలకు తెలుగులో సమాధానమిస్తుంది.', ttsLang:'te-IN' },
};

const LAWS = [
  'Indian Penal Code (IPC) 1860','Code of Criminal Procedure 1973','Indian Evidence Act 1872',
  'Right to Information Act 2005','Consumer Protection Act 2019','Domestic Violence Act 2005',
  'POCSO Act 2012','IT Act 2000','Dowry Prohibition Act 1961','Hindu Marriage Act 1955',
  'Special Marriage Act 1954','Hindu Succession Act 1956','Transfer of Property Act 1882',
  'Industrial Disputes Act 1947','Minimum Wages Act 1948',
];

const LAWYERS = [
  { name:'Supreme Court Legal Aid Committee', city:'New Delhi', phone:'011-23388922', type:'Legal Aid', free:true },
  { name:'Delhi State Legal Services Authority', city:'New Delhi', phone:'011-23072813', type:'Legal Aid', free:true },
  { name:'NALSA — National Legal Services', city:'All India', phone:'15100', type:'Legal Aid', free:true },
  { name:'Mumbai High Court Legal Aid', city:'Mumbai', phone:'022-22620871', type:'Legal Aid', free:true },
  { name:'Tis Hazari Bar Association', city:'New Delhi', phone:'011-23962879', type:'Bar Assoc.', free:false },
  { name:'Bombay Bar Association', city:'Mumbai', phone:'022-22621186', type:'Bar Assoc.', free:false },
  { name:'Bangalore Bar Association', city:'Bengaluru', phone:'080-22864531', type:'Bar Assoc.', free:false },
  { name:'Chennai Bar Council', city:'Chennai', phone:'044-25341152', type:'Bar Assoc.', free:false },
];

export default function SettingsPage({ user, theme, onToggleTheme, onBack, onLogout, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [selectedLang, setSelectedLang] = useState(user.preferences?.language || 'en');
  const [fontSize, setFontSize] = useState(user.preferences?.fontSize || 15);
  const [ttsEnabled, setTtsEnabled] = useState(user.preferences?.ttsEnabled ?? false);
  const [ttsAutoRead, setTtsAutoRead] = useState(user.preferences?.ttsAutoRead ?? false);
  const [ttsSpeed, setTtsSpeed] = useState(user.preferences?.ttsSpeed ?? 1.0);
  const [ttsGender, setTtsGender] = useState(user.preferences?.ttsVoiceGender ?? 'female');
  const [saveMsg, setSaveMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [loginActivity, setLoginActivity] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [lawyerCity, setLawyerCity] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'bookmarks') loadBookmarks();
    if (activeTab === 'profile') loadLoginActivity();
    if (activeTab === 'dashboard') loadAnalytics();
  }, [activeTab]);

  const loadBookmarks = async () => {
    try { const { data } = await api.get('/auth/bookmarks'); setBookmarks(data); } catch(e){}
  };
  const loadLoginActivity = async () => {
    try { const { data } = await api.get('/auth/login-activity'); setLoginActivity(data); } catch(e){}
  };
  const loadAnalytics = async () => {
    try { const { data } = await api.get('/chat/analytics'); setAnalytics(data); } catch(e){}
  };

  const saveProfile = async () => {
    try {
      const { data } = await api.put('/auth/profile', { name: profile.name, email: profile.email, profilePhoto });
      const merged = { ...user, name: data.name, email: data.email, profilePhoto: data.profilePhoto, preferences: data.preferences };
      localStorage.setItem('nyaybot_user', JSON.stringify(merged));
      onUserUpdate(data);
      setSaveMsg('✅ Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (e) { setSaveMsg('❌ Failed to save'); }
  };

  const savePref = async (prefs) => {
    try { await api.put('/auth/profile', { preferences: prefs }); } catch(e){}
  };

  const saveLang = async (code) => {
    setSelectedLang(code);
    await savePref({ language: code });
    onUserUpdate({ ...user, preferences: { ...user.preferences, language: code } });
  };

  const saveFontSize = async (v) => {
    setFontSize(v);
    await savePref({ fontSize: v });
  };

  const saveTTS = async (updates) => {
    const newPrefs = { ttsEnabled, ttsAutoRead, ttsSpeed, ttsVoiceGender: ttsGender, ...updates };
    await savePref(newPrefs);
    onUserUpdate({ ...user, preferences: { ...user.preferences, ...newPrefs } });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeBookmark = async (id) => {
    try {
      await api.delete(`/auth/bookmarks/${id}`);
      setBookmarks(bm => bm.filter(b => b._id !== id));
    } catch(e){}
  };

  const deleteAccount = async () => {
    try { await api.delete('/auth/delete'); onLogout(); }
    catch (e) { alert('Failed to delete account'); }
  };

  const getVoicesReady = () => new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve([]);
    const voices = synth.getVoices();
    if (voices.length > 0) return resolve(voices);
    const handler = () => { resolve(synth.getVoices()); synth.removeEventListener('voiceschanged', handler); };
    synth.addEventListener('voiceschanged', handler);
    setTimeout(() => resolve(synth.getVoices()), 1500);
  });

  const testVoice = async () => {
    if (!window.speechSynthesis) return alert('TTS not supported in this browser');
    window.speechSynthesis.cancel();

    const voices = await getVoicesReady();
    const u = new SpeechSynthesisUtterance(LANG_DATA[selectedLang].preview);
    u.lang = LANG_DATA[selectedLang].ttsLang;
    u.rate = Math.min(Math.max(ttsSpeed, 0.5), 2.0);

    // Try language match, fallback to English, fallback to any
    const target = selectedLang === 'en' ? 'en' : selectedLang;
    let filtered = voices.filter(v => v.lang.toLowerCase().startsWith(target));
    if (!filtered.length) filtered = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    if (!filtered.length) filtered = voices;

    if (filtered.length) {
      const pref = filtered.find(v =>
        ttsGender === 'female'
          ? /female|woman|zira|hazel|susan|heera|kalpana/i.test(v.name)
          : /male|man|david|mark|ravi|hemant/i.test(v.name)
      );
      u.voice = pref || filtered[0];
    }

    u.onerror = (e) => console.warn('TTS test error:', e.error);
    window.speechSynthesis.speak(u);
  };

  const s = {
    page: { display:'flex', height:'100vh', overflow:'hidden' },
    sidebar: { width:220, background:'var(--card)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'20px 0', flexShrink:0 },
    navItem: (active) => ({ padding:'10px 20px', fontSize:14, color: active ? 'var(--accent)' : 'var(--text2)', cursor:'pointer', transition:'.15s', display:'flex', alignItems:'center', gap:10, borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent', background: active ? 'var(--card2)' : 'transparent' }),
    content: { flex:1, overflowY:'auto', padding:28 },
    sTitle: { fontSize:18, fontWeight:600, marginBottom:6 },
    sDesc: { fontSize:13, color:'var(--text2)', marginBottom:20, lineHeight:1.5 },
    input: { width:'100%', padding:'10px 14px', background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, outline:'none', marginBottom:12 },
    card: { background:'var(--card2)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 20px', marginBottom:12 },
    btn: { padding:'9px 20px', background:'var(--accent)', color:'#fff', borderRadius:8, fontSize:14, fontWeight:500, cursor:'pointer', border:'none' },
    btnGhost: { padding:'9px 18px', border:'1px solid var(--border)', borderRadius:8, fontSize:14, color:'var(--text2)', cursor:'pointer', background:'none' },
    btnDanger: { padding:'9px 18px', background:'var(--danger)', color:'#fff', borderRadius:8, fontSize:14, cursor:'pointer', border:'none' },
    toggle: (on) => ({
      width:40, height:22, borderRadius:11, background: on ? 'var(--accent)' : 'var(--border)', position:'relative', cursor:'pointer', transition:'.2s', flexShrink:0
    }),
    toggleDot: (on) => ({
      width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: on ? 21 : 3, transition:'.2s'
    }),
  };

  const Toggle = ({ on, onChange }) => (
    <div style={s.toggle(on)} onClick={() => onChange(!on)}>
      <div style={s.toggleDot(on)} />
    </div>
  );

  const TABS = [
    {id:'profile', label:'👤 Profile'},
    {id:'language', label:'🌐 Language'},
    {id:'appearance', label:'🎨 Appearance'},
    {id:'accessibility', label:'♿ Accessibility'},
    {id:'bookmarks', label:'🔖 Bookmarks'},
    {id:'dashboard', label:'📊 Dashboard'},
    {id:'lawyers', label:'🏛 Lawyers'},
    {id:'privacy', label:'🔒 Privacy'},
    {id:'about', label:'ℹ️ About'},
  ];

  const filteredLawyers = lawyerCity
    ? LAWYERS.filter(l => l.city.toLowerCase().includes(lawyerCity.toLowerCase()))
    : LAWYERS;

  return (
    <div style={s.page}>
      <div style={s.sidebar}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 20px', color:'var(--text2)', fontSize:13, cursor:'pointer', marginBottom:12 }} onClick={onBack}>← Back to Chat</div>
        <div style={{ fontSize:16, fontWeight:700, padding:'0 20px', marginBottom:16 }}>Settings</div>
        {TABS.map(t => <div key={t.id} style={s.navItem(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>{t.label}</div>)}
      </div>

      <div style={s.content}>

        {/* PROFILE */}
        {activeTab==='profile' && (
          <div>
            <div style={s.sTitle}>Profile</div>
            <div style={s.sDesc}>Manage your NyayBot account</div>

            {/* Photo */}
            <div style={{ ...s.card, display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#fff', overflow:'hidden', flexShrink:0 }}>
                {profilePhoto ? <img src={profilePhoto} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>Profile Photo</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btn} onClick={() => fileInputRef.current?.click()}>Upload Photo</button>
                  {profilePhoto && <button style={s.btnGhost} onClick={() => setProfilePhoto(null)}>Remove</button>}
                </div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Max 2MB. JPG or PNG.</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoUpload} />
            </div>

            <input style={s.input} value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Full Name" />
            <input style={s.input} value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="Email" />
            <button style={s.btn} onClick={saveProfile}>Save Changes</button>
            {saveMsg && <span style={{ marginLeft:12, fontSize:13, color: saveMsg.startsWith('✅') ? 'var(--accent)' : 'var(--danger)' }}>{saveMsg}</span>}

            {/* Login Activity */}
            {loginActivity.length > 0 && (
              <div style={{ marginTop:28 }}>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>Recent Login Activity</div>
                {loginActivity.slice(0,8).map((a, i) => (
                  <div key={i} style={{ ...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{a.device}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{a.ip} · {new Date(a.timestamp).toLocaleString('en-IN')}</div>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color: a.status==='success' ? 'var(--accent)' : 'var(--danger)', padding:'3px 10px', borderRadius:12, background: a.status==='success' ? 'rgba(0,201,167,.1)' : 'rgba(224,92,92,.1)' }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ border:'1px solid #7a2020', borderRadius:10, padding:20, marginTop:24 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--danger)', marginBottom:6 }}>Danger Zone</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>Permanently delete your account and all data</div>
              <button style={s.btnDanger} onClick={()=>setShowDeleteModal(true)}>Delete Account</button>
            </div>
          </div>
        )}

        {/* LANGUAGE */}
        {activeTab==='language' && (
          <div>
            <div style={s.sTitle}>Language</div>
            <div style={s.sDesc}>NyayBot will respond entirely in your selected language.</div>
            {Object.entries(LANG_DATA).map(([code, d]) => (
              <div key={code} onClick={() => saveLang(code)} style={{ ...s.card, display:'flex', alignItems:'center', gap:14, cursor:'pointer', border: selectedLang===code ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                <span style={{ fontSize:24 }}>{d.flag}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{d.name}</div>
                  <div style={{ fontSize:13, color:'var(--text2)' }}>{d.script}</div>
                </div>
                {selectedLang===code && <span style={{ color:'var(--accent)', fontSize:18 }}>✓</span>}
              </div>
            ))}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:14, marginTop:4 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Live Preview</div>
              <div style={{ fontSize:15, lineHeight:1.6 }}>{LANG_DATA[selectedLang].preview}</div>
            </div>
          </div>
        )}

        {/* APPEARANCE */}
        {activeTab==='appearance' && (
          <div>
            <div style={s.sTitle}>Appearance</div>
            <div style={s.sDesc}>Customize how NyayBot looks</div>
            <div style={s.card}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Theme</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>Dark (teal) or Light (purple)</div>
              <button style={s.btn} onClick={onToggleTheme}>{theme==='dark' ? '☀ Switch to Light' : '🌙 Switch to Dark'}</button>
            </div>
            <div style={s.card}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Font Size</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>Adjust text size for readability</div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:12, color:'var(--text3)' }}>A</span>
                <input type="range" min={12} max={20} step={1} value={fontSize} onChange={e=>saveFontSize(Number(e.target.value))} style={{ flex:1 }} />
                <span style={{ fontSize:18, color:'var(--text3)' }}>A</span>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)', minWidth:36 }}>{fontSize}px</span>
              </div>
              <div style={{ fontSize:fontSize, color:'var(--text)', marginTop:10, padding:10, background:'var(--bg)', borderRadius:8, lineHeight:1.7 }}>
                Section 498A IPC deals with cruelty by husband or relatives against a married woman.
              </div>
            </div>
          </div>
        )}

        {/* ACCESSIBILITY */}
        {activeTab==='accessibility' && (
          <div>
            <div style={s.sTitle}>Accessibility</div>
            <div style={s.sDesc}>Text-to-Speech and other accessibility settings</div>

            {/* TTS Master Toggle */}
            <div style={s.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: ttsEnabled ? 16 : 0 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>🔊 Text to Speech</div>
                  <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Have NyayBot read bot replies aloud</div>
                </div>
                <Toggle on={ttsEnabled} onChange={(v) => { setTtsEnabled(v); saveTTS({ ttsEnabled: v }); }} />
              </div>

              {ttsEnabled && (
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Auto-read */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>Auto-read new replies</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>Automatically read each new bot response</div>
                    </div>
                    <Toggle on={ttsAutoRead} onChange={(v) => { setTtsAutoRead(v); saveTTS({ ttsAutoRead: v }); }} />
                  </div>

                  {/* Voice gender */}
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Voice</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {['female','male'].map(g => (
                        <button key={g} onClick={() => { setTtsGender(g); saveTTS({ ttsVoiceGender: g }); }}
                          style={{ padding:'6px 18px', border:`1px solid ${ttsGender===g ? 'var(--accent)' : 'var(--border)'}`, borderRadius:8, fontSize:13, color: ttsGender===g ? 'var(--accent)' : 'var(--text2)', background:'none', fontWeight: ttsGender===g ? 600 : 400 }}>
                          {g === 'female' ? '👩 Female' : '👨 Male'}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Availability depends on voices installed on your device.</div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Speed: {ttsSpeed.toFixed(1)}x</div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:12, color:'var(--text3)' }}>0.5×</span>
                      <input type="range" min={0.5} max={2.0} step={0.1} value={ttsSpeed} style={{ flex:1 }}
                        onChange={e => { const v = Number(e.target.value); setTtsSpeed(v); }}
                        onMouseUp={e => saveTTS({ ttsSpeed: Number(e.target.value) })}
                        onTouchEnd={e => saveTTS({ ttsSpeed: Number(e.target.value) })} />
                      <span style={{ fontSize:12, color:'var(--text3)' }}>2.0×</span>
                    </div>
                  </div>

                  {/* Language note */}
                  <div style={{ fontSize:12, color:'var(--text3)', padding:'8px 12px', background:'var(--bg)', borderRadius:6 }}>
                    🌐 TTS will use the voice for your selected language ({LANG_DATA[selectedLang].name}). Install that language pack on your device/OS for best results.
                  </div>

                  {/* Test */}
                  <button style={s.btnGhost} onClick={testVoice}>🔊 Test Voice</button>
                </div>
              )}
            </div>

            {/* Other accessibility */}
            <div style={s.card}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:8 }}>Keyboard Shortcuts</div>
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:2.2 }}>
                <code style={{ background:'var(--bg)', padding:'2px 8px', borderRadius:4, marginRight:8 }}>Enter</code>Send message<br/>
                <code style={{ background:'var(--bg)', padding:'2px 8px', borderRadius:4, marginRight:8 }}>Shift+Enter</code>New line<br/>
                <code style={{ background:'var(--bg)', padding:'2px 8px', borderRadius:4, marginRight:8 }}>Ctrl+K</code>New chat
              </div>
            </div>
          </div>
        )}

        {/* BOOKMARKS */}
        {activeTab==='bookmarks' && (
          <div>
            <div style={s.sTitle}>Bookmarks</div>
            <div style={s.sDesc}>Legal answers you've saved for quick reference</div>
            {bookmarks.length === 0 && (
              <div style={{ ...s.card, color:'var(--text3)', fontSize:14 }}>
                No bookmarks yet. Click "🔖 Save" on any bot reply to save it here.
              </div>
            )}
            {bookmarks.map((b, i) => (
              <div key={b._id || i} style={s.card}>
                <div style={{ fontSize:13, lineHeight:1.6, color:'var(--text)', marginBottom:8, whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:120, overflow:'hidden' }}>
                  {b.content}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>Saved {new Date(b.savedAt).toLocaleDateString('en-IN')}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => navigator.clipboard.writeText(b.content)}
                      style={{ padding:'3px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--text2)', background:'none' }}>
                      📋 Copy
                    </button>
                    <button onClick={() => removeBookmark(b._id)}
                      style={{ padding:'3px 10px', border:'1px solid var(--danger)', borderRadius:6, fontSize:12, color:'var(--danger)', background:'none' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab==='dashboard' && (
          <div>
            <div style={s.sTitle}>Dashboard</div>
            <div style={s.sDesc}>Your usage analytics</div>
            {!analytics ? (
              <div style={{ color:'var(--text3)', fontSize:14 }}>Loading analytics…</div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:20 }}>
                  {[
                    { label:'Total Chats', value: analytics.totalChats, icon:'💬' },
                    { label:'Questions Asked', value: analytics.totalMessages, icon:'❓' },
                    { label:'Topics Explored', value: analytics.topTopics.filter(t=>t.count>0).length, icon:'📚' },
                  ].map(s2 => (
                    <div key={s2.label} style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:10, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:24 }}>{s2.icon}</div>
                      <div style={{ fontSize:28, fontWeight:700, color:'var(--accent)', marginTop:4 }}>{s2.value}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{s2.label}</div>
                    </div>
                  ))}
                </div>

                {/* Top Topics */}
                <div style={s.card}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Top Topics</div>
                  {analytics.topTopics.map(t => (
                    <div key={t.topic} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                        <span>{t.topic}</span>
                        <span style={{ color:'var(--text3)' }}>{t.count}</span>
                      </div>
                      <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'var(--accent)', width:`${Math.min(100, (t.count / (analytics.topTopics[0]?.count || 1)) * 100)}%`, borderRadius:3, transition:'.5s' }} />
                      </div>
                    </div>
                  ))}
                  {analytics.topTopics.every(t => t.count === 0) && (
                    <div style={{ fontSize:13, color:'var(--text3)' }}>No topic data yet — start chatting!</div>
                  )}
                </div>

                {/* Daily Activity (last 14 days) */}
                <div style={s.card}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Daily Activity (Last 14 Days)</div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80 }}>
                    {analytics.dailyActivity.slice(-14).map(d => {
                      const maxCount = Math.max(...analytics.dailyActivity.map(x => x.count), 1);
                      const h = Math.max(4, (d.count / maxCount) * 72);
                      return (
                        <div key={d.date} title={`${d.date}: ${d.count} messages`}
                          style={{ flex:1, background: d.count > 0 ? 'var(--accent)' : 'var(--border)', height:h, borderRadius:3, opacity: d.count > 0 ? 1 : 0.3, transition:'.3s', cursor:'default' }} />
                      );
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)', marginTop:6 }}>
                    <span>{analytics.dailyActivity.slice(-14)[0]?.date?.slice(5)}</span>
                    <span>Today</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* LAWYERS */}
        {activeTab==='lawyers' && (
          <div>
            <div style={s.sTitle}>Lawyer Directory</div>
            <div style={s.sDesc}>Legal aid services and bar associations across India. Free legal aid is available for those who qualify.</div>
            <input style={s.input} placeholder="Filter by city (e.g. Mumbai, Delhi)" value={lawyerCity} onChange={e => setLawyerCity(e.target.value)} />
            {filteredLawyers.map((l, i) => (
              <div key={i} style={s.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{l.name}</div>
                    <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>📍 {l.city} · {l.type}</div>
                    <div style={{ fontSize:13, color:'var(--accent)', marginTop:4, fontWeight:500 }}>📞 {l.phone}</div>
                  </div>
                  {l.free && (
                    <span style={{ padding:'3px 10px', background:'rgba(0,201,167,.1)', border:'1px solid var(--accent)', borderRadius:12, fontSize:11, color:'var(--accent)', fontWeight:600, flexShrink:0 }}>FREE</span>
                  )}
                </div>
              </div>
            ))}
            <div style={{ fontSize:12, color:'var(--text3)', padding:'12px 4px', lineHeight:1.7 }}>
              💡 For free legal aid, call NALSA at 15100. Eligibility: women, SC/ST, persons with disability, children, victims of trafficking, disaster victims, or those with annual income below the threshold set by the state.
            </div>
          </div>
        )}

        {/* PRIVACY */}
        {activeTab==='privacy' && (
          <div>
            <div style={s.sTitle}>Privacy & Data</div>
            <div style={s.sDesc}>Exactly what NyayBot stores and why</div>
            <div style={s.card}>
              {[
                ['Your email address','Account login'],
                ['Account creation date','Record keeping'],
                ['Language preference','Localization'],
                ['Theme preference','UI personalization'],
                ['Chat history (90 days)','Context for better answers'],
                ['Profile photo','Stored in your account, not shared'],
                ['Data shared with third parties','Nothing — zero'],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:14 }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:600, color: k.includes('third') ? 'var(--accent)' : 'var(--text2)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>AI Provider</div>
              <div style={{ fontSize:13, color:'var(--text2)' }}>Your messages are processed by Groq API (Llama 3.3-70B). Your Groq API key is stored only in the backend <code>.env</code> file and never exposed to the browser.</div>
            </div>
            <button style={{ ...s.btnGhost, marginTop:4 }} onClick={()=>{ if(confirm('Clear all chat history?')) api.delete('/chat/all/clear').catch(()=>{}) }}>
              🗑 Clear All Chat History
            </button>
          </div>
        )}

        {/* ABOUT */}
        {activeTab==='about' && (
          <div>
            <div style={s.sTitle}>About NyayBot</div>
            <div style={s.sDesc}>AI-powered Indian Legal Assistant — Version 2.0.0</div>
            <div style={s.card}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Laws NyayBot covers</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {LAWS.map(l=><span key={l} style={{ display:'inline-block', padding:'4px 12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:20, fontSize:12, color:'var(--text2)' }}>{l}</span>)}
              </div>
            </div>
            <div style={s.card}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:8 }}>Disclaimer</div>
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>NyayBot provides general legal information only. It does not constitute legal advice. Always consult a qualified advocate for your specific situation. Laws change — verify with official sources before acting.</div>
            </div>
          </div>
        )}

      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:28, maxWidth:380, width:'90%' }}>
            <div style={{ fontSize:18, fontWeight:600, color:'var(--danger)', marginBottom:8 }}>⚠️ Delete Account?</div>
            <div style={{ fontSize:14, color:'var(--text2)', marginBottom:24, lineHeight:1.5 }}>This will permanently delete your account, all chat history, bookmarks, and personal data. This cannot be undone.</div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={s.btnGhost} onClick={()=>setShowDeleteModal(false)}>Cancel</button>
              <button style={s.btnDanger} onClick={deleteAccount}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
