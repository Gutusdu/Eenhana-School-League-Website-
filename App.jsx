import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy, CalendarDays, Goal, Newspaper, Shield, Menu, X, ArrowUpRight,
  MapPin, Clock3, ChevronRight, LockKeyhole, LogOut, Plus, RefreshCw,
  Users, ChartNoAxesColumnIncreasing, CircleDot, Star, CheckCircle2,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { isConfigured, supabase } from './supabase';

const demoTeams = [
  { id: 't1', name: 'Eenhana Primary', short_name: 'EPR', group_name: 'U15 Boys', color: '#e7b94e' },
  { id: 't2', name: 'Omuthito Combined', short_name: 'OCS', group_name: 'U15 Boys', color: '#58a6d8' },
  { id: 't3', name: 'School Team 03', short_name: 'ST3', group_name: 'U15 Boys', color: '#db7867' },
  { id: 't4', name: 'School Team 04', short_name: 'ST4', group_name: 'U15 Boys', color: '#9c8bd8' },
  { id: 't5', name: 'Eenhana Primary Girls', short_name: 'EPG', group_name: 'U15 Girls', color: '#d78eb4' },
  { id: 't6', name: 'Omuthito Girls', short_name: 'OG', group_name: 'U15 Girls', color: '#7fb69a' }
];
const demoMatches = [
  { id: 'm1', match_date: '2027-03-06', kickoff: '09:00', home_team_id: 't1', away_team_id: 't2', home_score: 2, away_score: 1, status: 'completed', competition: 'U15 Boys' },
  { id: 'm2', match_date: '2027-03-06', kickoff: '10:30', home_team_id: 't3', away_team_id: 't4', home_score: 0, away_score: 0, status: 'completed', competition: 'U15 Boys' },
  { id: 'm3', match_date: '2027-03-13', kickoff: '09:00', home_team_id: 't2', away_team_id: 't3', home_score: null, away_score: null, status: 'scheduled', competition: 'U15 Boys' },
  { id: 'm4', match_date: '2027-03-13', kickoff: '10:30', home_team_id: 't5', away_team_id: 't6', home_score: null, away_score: null, status: 'scheduled', competition: 'U15 Girls' }
];
const demoGoals = [
  { id: 'g1', player_name: 'Player A', team_id: 't1', match_id: 'm1', minute: 12 },
  { id: 'g2', player_name: 'Player B', team_id: 't1', match_id: 'm1', minute: 38 },
  { id: 'g3', player_name: 'Player C', team_id: 't2', match_id: 'm1', minute: 55 }
];
const demoReports = [
  { id: 'r1', title: 'A strong start to the season', body: 'Eenhana Primary opened the U15 Boys competition with a 2–1 win in an exciting first matchday.', published_at: '2027-03-06', competition: 'U15 Boys' }
];

const fmtDate = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBC';
const initials = (name='') => name.split(' ').map(x => x[0]).join('').slice(0,3).toUpperCase();

function App() {
  const [tab, setTab] = useState('overview');
  const [activeCompetition, setActiveCompetition] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailTab, setMatchDetailTab] = useState('report');
  const [gender, setGender] = useState('All');
  const [teams, setTeams] = useState(demoTeams);
  const [matches, setMatches] = useState(demoMatches);
  const [goals, setGoals] = useState(demoGoals);
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ event_type:'goal', match_id:'', team_id:'', player_id:'', player_name:'', minute:'', details:'' });
  const [editingEvent, setEditingEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [reports, setReports] = useState(demoReports);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState(isConfigured ? '' : 'Preview mode: connect your Supabase project to publish live league data.');
  const [form, setForm] = useState({ email: '', password: '' });
  const [adminTab, setAdminTab] = useState('match');
  const [newTeam, setNewTeam] = useState({ name: '', short_name: '', group_name: 'U15 Boys' });
  const [newPlayer, setNewPlayer] = useState({ team_id: '', full_name: '', shirt_number: '', position: '' });
  const [newMatch, setNewMatch] = useState({ match_date: '', kickoff: '09:00', home_team_id: '', away_team_id: '', competition: 'U15 Boys' });
  const [result, setResult] = useState({ match_id: '', home_score: '', away_score: '' });
  const [newGoal, setNewGoal] = useState({ match_id: '', player_name: '', team_id: '', minute: '' });
  const [newReport, setNewReport] = useState({ title: '', body: '', competition: 'U15 Boys', match_id: '' });
  const [newLineup, setNewLineup] = useState({ match_id: '', team_id: '', player_id: '', is_starting: true, position_slot: '' });

  const teamById = (id) => teams.find(t => String(t.id) === String(id));
  const filteredTeams = useMemo(() => activeCompetition ? teams.filter(t => t.group_name === activeCompetition) : teams, [teams, activeCompetition]);
  const filteredMatches = useMemo(() => activeCompetition ? matches.filter(m => m.competition === activeCompetition) : matches, [matches, activeCompetition]);

  async function loadData() {
    if (!isConfigured) return;
    setLoading(true);
    const [t, m, g, r, p, l] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('matches').select('*').order('match_date').order('kickoff'),
      supabase.from('goals').select('*'),
      supabase.from('reports').select('*').eq('published', true).order('published_at', { ascending: false }),
      supabase.from('players').select('*').order('shirt_number'),
      supabase.from('match_lineups').select('*')
    ]);
    const ev = await supabase.from('match_events').select('*').order('minute');
    const errors = [t.error, m.error, g.error, r.error, p.error, l.error, ev.error].filter(Boolean);
    if (errors.length) setNotice(`Database notice: ${errors[0].message}`);
    if (t.data) setTeams(t.data);
    if (m.data) setMatches(m.data);
    if (g.data) setGoals(g.data);
    if (ev.data) setEvents(ev.data);
    if (r.data) setReports(r.data);
    if (p.data) setPlayers(p.data);
    if (l.data) setLineups(l.data);
    setLoading(false);
  }


  async function deleteAdminEntry(table, id, description) {
    const typed = window.prompt(`Zum endgültigen Löschen von „${description}“ bitte exakt LÖSCHEN eingeben:`);
    if (typed !== 'LÖSCHEN') {
      if (typed !== null) setNotice('Löschen abgebrochen. Die Eingabe war nicht exakt „LÖSCHEN“.');
      return;
    }
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      setNotice(`Konnte nicht löschen: ${error.message}`);
      return;
    }
    setNotice('Eintrag wurde gelöscht.');
    await loadData();
  }

  const adminDeleteList = (items, table, labelFor) => (
    <section className="admin-existing-list">
      <div className="admin-existing-heading"><h3>Vorhandene Einträge</h3><span>{items.length}</span></div>
      {items.length ? items.map(item => (
        <div className="admin-existing-row" key={item.id}>
          <div className="admin-existing-copy"><b>{labelFor(item)}</b></div>
          <button type="button" className="admin-minus" aria-label="Eintrag löschen" title="Eintrag löschen" onClick={() => deleteAdminEntry(table, item.id, labelFor(item))}>−</button>
        </div>
      )) : <p className="admin-existing-empty">Noch keine Einträge vorhanden.</p>}
    </section>
  );

  useEffect(() => {
    if (!isConfigured) return;
    loadData();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      if (!user || !isConfigured) { setIsAdmin(false); return; }
      const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      setIsAdmin(Boolean(data));
    }
    checkAdmin();
  }, [user]);

  const standings = useMemo(() => {
    const rows = filteredTeams.map(t => ({ team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }));
    const byId = Object.fromEntries(rows.map(r => [String(r.team.id), r]));
    filteredMatches.filter(m => m.status === 'completed' && m.home_score != null && m.away_score != null).forEach(m => {
      const h = byId[String(m.home_team_id)], a = byId[String(m.away_team_id)];
      if (!h || !a) return;
      const hs = Number(m.home_score), as = Number(m.away_score);
      h.P++; a.P++; h.GF += hs; h.GA += as; a.GF += as; a.GA += hs;
      if (hs > as) { h.W++; h.Pts += 3; a.L++; }
      else if (hs < as) { a.W++; a.Pts += 3; h.L++; }
      else { h.D++; a.D++; h.Pts++; a.Pts++; }
    });
    return rows.sort((a,b) => b.Pts-a.Pts || (b.GF-b.GA)-(a.GF-a.GA) || b.GF-a.GF);
  }, [filteredTeams, filteredMatches]);

  const topScorers = useMemo(() => {
    const counts = {};
    const eligibleTeamIds = new Set(filteredTeams.map(t => String(t.id)));
    goals.filter(g => eligibleTeamIds.has(String(g.team_id))).forEach(g => {
      const key = `${g.player_name}|${g.team_id}`;
      counts[key] ||= { name: g.player_name, team: teamById(g.team_id)?.name || 'Unknown team', count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a,b) => b.count-a.count).slice(0,8);
  }, [goals, teams, filteredTeams]);

  const upcoming = filteredMatches.filter(m => m.status !== 'completed').slice(0,4);
  const recent = [...filteredMatches].filter(m => m.status === 'completed').sort((a,b) => b.match_date.localeCompare(a.match_date)).slice(0,4);

  async function login(e) {
    e.preventDefault();
    if (!isConfigured) return setNotice('Connect Supabase first. Preview mode does not support login.');
    const { error } = await supabase.auth.signInWithPassword(form);
    if (error) setNotice(error.message);
    else { setLoginOpen(false); setNotice('Signed in.'); }
  }
  async function logout() { await supabase.auth.signOut(); setIsAdmin(false); }
  async function addTeam(e) {
    e.preventDefault();
    const { error } = await supabase.from('teams').insert(newTeam);
    if (error) setNotice(error.message); else { setNewTeam({ name:'', short_name:'', group_name:'U15 Boys' }); setNotice('Team added.'); loadData(); }
  }
  async function addMatch(e) {
    e.preventDefault();
    if (newMatch.home_team_id === newMatch.away_team_id) return setNotice('A team cannot play against itself.');
    const { error } = await supabase.from('matches').insert({ ...newMatch, status: 'scheduled' });
    if (error) setNotice(error.message); else { setNewMatch({ match_date:'', kickoff:'09:00', home_team_id:'', away_team_id:'', competition:'U15 Boys' }); setNotice('Fixture added.'); loadData(); }
  }
  async function saveResult(e) {
    e.preventDefault();
    const { error } = await supabase.from('matches').update({ home_score:Number(result.home_score), away_score:Number(result.away_score), status:'completed' }).eq('id', result.match_id);
    if (error) setNotice(error.message); else { setResult({ match_id:'', home_score:'', away_score:'' }); setNotice('Result saved. The table has been updated.'); loadData(); }
  }
  async function addGoal(e) {
    e.preventDefault();
    const { error } = await supabase.from('goals').insert({ ...newGoal, minute: newGoal.minute ? Number(newGoal.minute) : null });
    if (error) setNotice(error.message); else { setNewGoal({ match_id:'', player_name:'', team_id:'', minute:'' }); setNotice('Goal added to the scorer list.'); loadData(); }
  }
  async function saveEvent(e) {
    e.preventDefault();
    const payload = { event_type:eventForm.event_type, match_id:selectedMatch.id, team_id:eventForm.team_id, player_id:eventForm.player_id || null, player_name:eventForm.player_name || (players.find(p=>String(p.id)===String(eventForm.player_id))?.full_name ?? null), minute:eventForm.minute ? Number(eventForm.minute) : null, details:eventForm.details.trim() || null };
    const query = editingEvent ? supabase.from('match_events').update(payload).eq('id', editingEvent.id) : supabase.from('match_events').insert(payload);
    const { error } = await query;
    if (error) setNotice(error.message); else { setNotice(editingEvent ? 'Spielereignis aktualisiert.' : 'Spielereignis hinzugefügt.'); setEditingEvent(null); setEventForm({ event_type:'goal', match_id:'', team_id:'', player_id:'', player_name:'', minute:'', details:'' }); await loadData(); }
  }
  function startEditEvent(ev) {
    setEditingEvent(ev);
    setEventForm({ event_type:ev.event_type, match_id:ev.match_id, team_id:ev.team_id, player_id:ev.player_id||'', player_name:ev.player_name||'', minute:ev.minute??'', details:ev.details||'' });
  }
  async function deleteEvent(ev) {
    const typed = window.prompt('Zum Löschen bitte exakt LÖSCHEN eingeben:');
    if (typed !== 'LÖSCHEN') return;
    const { error } = await supabase.from('match_events').delete().eq('id', ev.id);
    if (error) setNotice(error.message); else { setNotice('Spielereignis gelöscht.'); await loadData(); }
  }

  async function addLineup(e) {
    e.preventDefault();
    const { error } = await supabase.from('match_lineups').upsert({ ...newLineup, position_slot: newLineup.position_slot || null }, { onConflict: 'match_id,player_id' });
    if (error) setNotice(error.message); else { setNewLineup({ match_id:'', team_id:'', player_id:'', is_starting:true, position_slot:'' }); setNotice('Player added to match line-up.'); loadData(); }
  }

  async function addReport(e) {
    e.preventDefault();
    const { error } = await supabase.from('reports').insert({ ...newReport, match_id: newReport.match_id || null, published:true, published_at:new Date().toISOString().slice(0,10) });
    if (error) setNotice(error.message); else { setNewReport({ title:'', body:'', competition:'U15 Boys', match_id:'' }); setNotice('Report published.'); loadData(); }
  }

  const nav = [
    ['overview','Overview',Trophy], ['fixtures','Fixtures & Results',CalendarDays],
    ['table','League Table',ChartNoAxesColumnIncreasing], ['scorers','Top Scorers',Goal],
    ['reports','Match Reports',Newspaper], ['teams','Teams',Shield]
  ];
  const go = (id) => { setTab(id); setSelectedTeam(null); setSelectedMatch(null); setMobileOpen(false); window.scrollTo({ top:0, behavior:'smooth' }); };
  const chooseCompetition = (name) => { setActiveCompetition(name); setGender(name); setTab('overview'); setSelectedTeam(null); setSelectedMatch(null); window.scrollTo({ top:0, behavior:'smooth' }); };
  const matchCard = (m) => (
    <button className="match-card match-card-clickable" key={m.id} onClick={() => { setSelectedTeam(null); setSelectedMatch(m); setMatchDetailTab('report'); }} aria-label={`Open match ${teamById(m.home_team_id)?.name || 'home team'} versus ${teamById(m.away_team_id)?.name || 'away team'}`}>
      <div className="match-meta"><span>{m.competition}</span><span>{fmtDate(m.match_date)} · {m.kickoff || 'TBC'}</span></div>
      <div className="match-line">
        <div className="match-team"><span className="team-mark">{initials(teamById(m.home_team_id)?.short_name || teamById(m.home_team_id)?.name)}</span><strong>{teamById(m.home_team_id)?.name || 'Home team'}</strong></div>
        <div className="score">{m.status === 'completed' ? `${m.home_score} – ${m.away_score}` : <span className="vs">VS</span>}</div>
        <div className="match-team away"><strong>{teamById(m.away_team_id)?.name || 'Away team'}</strong><span className="team-mark">{initials(teamById(m.away_team_id)?.short_name || teamById(m.away_team_id)?.name)}</span></div>
      </div>
      <div className="match-foot"><span className={m.status === 'completed' ? 'status done' : 'status upcoming'}>{m.status === 'completed' ? 'Full time' : 'Upcoming'}</span><span><MapPin size={13}/> Eenhana</span><span className="open-match">View match <ChevronRight size={13}/></span></div>
    </button>
  );

  return (
    <div className="app-shell">
      <div className="top-strip"><div className="container strip-inner"><span>THE HOME OF SCHOOL FOOTBALL IN EENHANA</span><span>SEASON 2027 <i/> U15 BOYS & GIRLS</span></div></div>
      <header className="site-header">
        <div className="container header-inner">
          <button className="brand" onClick={() => { setActiveCompetition(null); go('overview'); }} aria-label="Home">
            <img className="league-logo" src="/assets/eenhana-school-league-logo.jpeg" alt="Eenhana School League"/>
          </button>
          {activeCompetition && <nav className="desktop-nav">{nav.map(([id,label,Icon]) => <button key={id} className={tab===id?'active':''} onClick={()=>go(id)}>{label}</button>)}</nav>}
          <div className="header-actions">
            {activeCompetition && <button className="change-competition" onClick={()=>{setActiveCompetition(null);go('overview')}}>Change competition</button>}
            <button className="admin-button" onClick={()=>user&&isAdmin?go('admin'):setLoginOpen(true)}><LockKeyhole size={15}/>{user&&isAdmin?'Admin dashboard':'Admin login'}</button>
            <button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen?<X/>:<Menu/>}</button>
          </div>
        </div>
        {mobileOpen && activeCompetition && <div className="mobile-nav">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={17}/>{label}</button>)}</div>}
      </header>

      {notice && <div className="notice container"><AlertCircle size={16}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}

      {tab==='overview' && !selectedTeam && !selectedMatch && !activeCompetition && <main className="container competition-home">
        <div className="competition-intro"><span className="kicker">OFFICIAL LEAGUE PLATFORM · SEASON 2027</span><h1>ONE LEAGUE.<br/><em>ONE COMMUNITY.</em></h1><p>Choose your competition to follow fixtures, results, standings and the next generation of football talent in Eenhana.</p></div>
        <div className="competition-choices"><button className="competition-choice boys" onClick={()=>chooseCompetition('U15 Boys')}><span className="choice-mark"><Shield size={32}/></span><span className="choice-kicker">SEASON 2027</span><strong>U15 BOYS</strong><span className="choice-link">ENTER COMPETITION <ArrowUpRight size={16}/></span></button><button className="competition-choice girls" onClick={()=>chooseCompetition('U15 Girls')}><span className="choice-mark"><Shield size={32}/></span><span className="choice-kicker">SEASON 2027</span><strong>U15 GIRLS</strong><span className="choice-link">ENTER COMPETITION <ArrowUpRight size={16}/></span></button></div>
        <div className="competition-home-footer"><MapPin size={14}/> EENHANA, NAMIBIA <span>·</span> FOOTBALL FOR THE FUTURE</div>
      </main>}

      {tab==='overview' && !selectedTeam && !selectedMatch && activeCompetition && <>
        <section className="hero">
          <div className="hero-bg"></div>
          <div className="container hero-content">
            <div className="eyebrow"><span className="live-dot"></span> {activeCompetition.toUpperCase()} · OFFICIAL COMPETITION</div>
            <h1>ONE LEAGUE.<br/><em>ONE COMMUNITY.</em></h1>
            <p>Celebrating school football, developing young talent and bringing Eenhana together.</p>
            <div className="hero-buttons"><button className="primary-btn" onClick={()=>go('fixtures')}>Explore the league <ArrowUpRight size={17}/></button><button className="ghost-btn" onClick={()=>go('table')}>View standings</button></div>
            <div className="hero-season"><b>2027</b><span>SEASON<br/>U15 COMPETITION</span></div>
          </div>
          <div className="hero-bottom"><div className="container hero-bottom-inner"><span><MapPin size={15}/> EENHANA, NAMIBIA</span><span>{activeCompetition.toUpperCase()}</span><span>FOOTBALL FOR THE FUTURE</span></div></div>
        </section>
        <main className="container main-content">
          <div className="section-heading"><div><span className="kicker">THE LATEST</span><h2>League centre</h2></div><button className="text-link" onClick={()=>go('fixtures')}>All fixtures & results <ChevronRight size={16}/></button></div>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-icon"><Shield/></span><strong>{teams.length}</strong><small>TEAMS</small></div>
            <div className="stat-card"><span className="stat-icon"><CalendarDays/></span><strong>{matches.length}</strong><small>MATCHES SCHEDULED</small></div>
            <div className="stat-card"><span className="stat-icon"><Goal/></span><strong>{goals.length}</strong><small>GOALS RECORDED</small></div>
            <div className="stat-card"><span className="stat-icon"><Users/></span><strong>U15</strong><small>BOYS & GIRLS</small></div>
          </div>
          <div className="content-grid">
            <section><div className="section-heading compact"><div><span className="kicker">ON THE PITCH</span><h2>Latest results</h2></div><button className="text-link" onClick={()=>go('fixtures')}>View all <ChevronRight size={15}/></button></div>
              {recent.length?recent.map(matchCard):<div className="empty-state">No results yet. Check back after the first matchday.</div>}
            </section>
            <section><div className="section-heading compact"><div><span className="kicker">COMING UP</span><h2>Next fixtures</h2></div></div>
              {upcoming.length?upcoming.map(matchCard):<div className="empty-state">No upcoming fixtures have been published yet.</div>}
            </section>
          </div>
          <div className="feature-band"><div><span className="kicker">MORE THAN A GAME</span><h2>Local pride.<br/><em>Future stars.</em></h2><p>Follow every match, celebrate every goal and support the next generation of football talent.</p></div><div className="feature-badge"><Trophy size={38}/><b>PLAY<br/>WITH PRIDE</b><small>EENHANA · 2027</small></div></div>
        </main>
      </>}


      {selectedTeam && <main className="container page-content detail-page">
        <button className="back-link" onClick={()=>setSelectedTeam(null)}>← Back to league table</button>
        <div className="team-profile-hero">
          <span className="team-crest large">{initials(selectedTeam.short_name||selectedTeam.name)}</span>
          <div><span className="kicker">{selectedTeam.group_name} · SEASON 2027</span><h1>{selectedTeam.name}</h1><p>Team profile · Eenhana School League</p></div>
        </div>
        {(() => {
          const tm = matches.filter(m => String(m.home_team_id)===String(selectedTeam.id)||String(m.away_team_id)===String(selectedTeam.id));
          const played = tm.filter(m=>m.status==='completed');
          const wins = played.filter(m => (String(m.home_team_id)===String(selectedTeam.id) ? Number(m.home_score)>Number(m.away_score) : Number(m.away_score)>Number(m.home_score))).length;
          const draws = played.filter(m=>Number(m.home_score)===Number(m.away_score)).length;
          const gf = played.reduce((n,m)=>n+Number(String(m.home_team_id)===String(selectedTeam.id)?m.home_score:m.away_score),0);
          const ga = played.reduce((n,m)=>n+Number(String(m.home_team_id)===String(selectedTeam.id)?m.away_score:m.home_score),0);
          const teamGoals = goals.filter(g=>String(g.team_id)===String(selectedTeam.id));
          const scorers = Object.values(teamGoals.reduce((a,g)=>{a[g.player_name]=(a[g.player_name]||0)+1;return a;},{})).length;
          const roster = players.filter(p=>String(p.team_id)===String(selectedTeam.id));
          return <>
            <div className="stat-grid team-stats">
              <div className="stat-card"><strong>{played.length}</strong><small>PLAYED</small></div>
              <div className="stat-card"><strong>{wins}</strong><small>WINS</small></div>
              <div className="stat-card"><strong>{draws}</strong><small>DRAWS</small></div>
              <div className="stat-card"><strong>{gf}:{ga}</strong><small>GOALS FOR : AGAINST</small></div>
            </div>
            <div className="content-grid">
              <section><div className="section-heading compact"><div><span className="kicker">THE SQUAD</span><h2>Team roster</h2></div><span className="muted text-xs">{roster.length} players</span></div>
                <div className="table-wrap"><table><thead><tr><th>NO.</th><th>PLAYER</th><th>POSITION</th></tr></thead><tbody>{roster.map(p=><tr key={p.id}><td>{p.shirt_number??'—'}</td><td><b>{p.full_name}</b></td><td>{p.position||'—'}</td></tr>)}</tbody></table>{!roster.length&&<div className="empty-state">The squad will be announced soon.</div>}</div>
              </section>
              <section><div className="section-heading compact"><div><span className="kicker">GOALS</span><h2>Team scorers</h2></div></div>
                <div className="scorer-list">{Object.entries(teamGoals.reduce((a,g)=>{a[g.player_name]=(a[g.player_name]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).map(([name,count])=><div className="scorer-row" key={name}><span className="scorer-avatar">{initials(name)}</span><div className="scorer-info"><b>{name}</b><small>{selectedTeam.name}</small></div><strong>{count}<small> GOALS</small></strong></div>)}{!teamGoals.length&&<div className="empty-state">No goals recorded yet.</div>}</div>
              </section>
            </div>
            <div className="section-heading compact"><div><span className="kicker">SEASON 2027</span><h2>Team fixtures</h2></div></div>
            {tm.map(matchCard)}{!tm.length&&<div className="empty-state">No fixtures published yet.</div>}
          </>;
        })()}
      </main>}

      {selectedMatch && <main className="container page-content detail-page">
        <button className="back-link" onClick={()=>{setSelectedMatch(null);setSelectedTeam(null);setTab('fixtures')}}>← Zurück zum Spielplan</button>
        <div className="match-center">
          <div className="match-center-hero">
            <div className="match-center-top"><span className="kicker">{selectedMatch.competition} · {fmtDate(selectedMatch.match_date)}</span><span className={`match-status ${selectedMatch.status==='completed'?'is-done':''}`}>{selectedMatch.status==='completed'?'BEENDET':selectedMatch.status==='postponed'?'VERSCHOBEN':'VORSCHAU'}</span></div>
            <div className="match-center-score">
              <div className="match-center-team"><span className="match-team-short">{teamById(selectedMatch.home_team_id)?.short_name||initials(teamById(selectedMatch.home_team_id)?.name||'HOME')}</span><b>{teamById(selectedMatch.home_team_id)?.name}</b><small>HEIM</small></div>
              <div className="match-center-result"><strong>{selectedMatch.status==='completed'?`${selectedMatch.home_score} : ${selectedMatch.away_score}`:'VS'}</strong><small>{selectedMatch.status==='completed'?'ENDSTAND':'ANSTOSS'}</small></div>
              <div className="match-center-team"><span className="match-team-short">{teamById(selectedMatch.away_team_id)?.short_name||initials(teamById(selectedMatch.away_team_id)?.name||'AWAY')}</span><b>{teamById(selectedMatch.away_team_id)?.name}</b><small>GAST</small></div>
            </div>
            <div className="match-center-meta"><span><CalendarDays size={14}/>{fmtDate(selectedMatch.match_date)}</span><span><Clock3 size={14}/>{selectedMatch.kickoff||'Zeit offen'}</span><span><MapPin size={14}/>{selectedMatch.venue||'Eenhana'}</span></div>
          </div>
          <div className="detail-tabs match-center-tabs"><button className={matchDetailTab==='report'?'active':''} onClick={()=>setMatchDetailTab('report')}>Spielbericht</button><button className={matchDetailTab==='lineups'?'active':''} onClick={()=>setMatchDetailTab('lineups')}>Aufstellungen</button></div>
          {matchDetailTab==='report' ? <div className="match-center-body">
            <section className="match-story-card"><span className="kicker">DER SPIELBERICHT</span><h2>{reports.find(r=>String(r.match_id)===String(selectedMatch.id))?.title || (selectedMatch.status==='completed'?'Der Spielbericht':'Spielvorschau')}</h2><p>{reports.find(r=>String(r.match_id)===String(selectedMatch.id))?.body || (selectedMatch.status==='completed'?'Der offizielle Spielbericht wird von der Ligaleitung veröffentlicht.':'Informationen zu diesem Spiel werden vor dem Anpfiff veröffentlicht.')}</p></section>
            <section className="match-events-card"><div className="match-section-heading"><div><span className="kicker">ALLE WICHTIGEN MOMENTE</span><h2>Spielverlauf</h2></div><span className="event-ball">⚽</span></div>
              {(events.filter(ev=>String(ev.match_id)===String(selectedMatch.id)).length || goals.filter(g=>String(g.match_id)===String(selectedMatch.id)).length) ? <div className="match-event-list">{(events.filter(ev=>String(ev.match_id)===String(selectedMatch.id)).length ? events.filter(ev=>String(ev.match_id)===String(selectedMatch.id)) : goals.filter(g=>String(g.match_id)===String(selectedMatch.id)).map(g=>({...g,event_type:'goal',details:null}))).sort((a,b)=>(Number(a.minute)||999)-(Number(b.minute)||999)).map(ev=><div className="match-event" key={ev.id}><div className="event-minute">{ev.minute?`${ev.minute}'`:'—'}</div><div className="event-marker">{ev.event_type==='goal'?'⚽':ev.event_type==='yellow_card'?'🟨':ev.event_type==='red_card'?'🟥':'🔄'}</div><div className="event-description"><b>{ev.player_name||'Spielereignis'}</b><small>{teamById(ev.team_id)?.name||'Mannschaft'}{ev.details?` · ${ev.details}`:''}</small></div>{isAdmin&&<div className="event-admin-actions"><button type="button" onClick={()=>startEditEvent(ev)} aria-label="Bearbeiten">✎</button><button type="button" onClick={()=>deleteEvent(ev)} aria-label="Löschen">−</button></div>}</div>)}</div> : <div className="empty-state">Noch keine Spielereignisse eingetragen.</div>}
              {isAdmin && <form className="admin-form match-event-admin-form" onSubmit={saveEvent}><h3>{editingEvent?'Spielereignis bearbeiten':'Spielereignis hinzufügen'}</h3><input type="hidden" value={selectedMatch.id}/><div className="form-two"><label>Ereignis<select value={eventForm.event_type} onChange={e=>setEventForm({...eventForm,event_type:e.target.value})}><option value="goal">Tor</option><option value="penalty">Elfmeter</option><option value="own_goal">Eigentor</option><option value="yellow_card">Gelbe Karte</option><option value="red_card">Rote Karte</option><option value="substitution">Auswechslung</option></select></label><label>Minute<input type="number" min="1" max="120" value={eventForm.minute} onChange={e=>setEventForm({...eventForm,minute:e.target.value})}/></label></div><label>Mannschaft<select required value={eventForm.team_id} onChange={e=>setEventForm({...eventForm,team_id:e.target.value,player_id:'',player_name:''})}><option value="">Mannschaft wählen</option>{[selectedMatch.home_team_id,selectedMatch.away_team_id].map(id=><option key={id} value={id}>{teamById(id)?.name}</option>)}</select></label><label>Spieler (optional)<select value={eventForm.player_id} onChange={e=>setEventForm({...eventForm,player_id:e.target.value,player_name:''})}><option value="">Kein Spieler / Name unten eingeben</option>{players.filter(p=>String(p.team_id)===String(eventForm.team_id)).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>Name (optional)<input value={eventForm.player_name} onChange={e=>setEventForm({...eventForm,player_name:e.target.value})} placeholder="Falls nicht im Kader"/></label><label>Details (optional)<input value={eventForm.details} onChange={e=>setEventForm({...eventForm,details:e.target.value})} placeholder="z. B. Elfmeter, Handspiel"/></label><div className="form-actions"><button className="primary-btn">{editingEvent?'Änderungen speichern':'Ereignis speichern'}</button>{editingEvent&&<button type="button" className="ghost-btn" onClick={()=>{setEditingEvent(null);setEventForm({event_type:'goal',match_id:'',team_id:'',player_id:'',player_name:'',minute:'',details:''});}}>Abbrechen</button>}</div></form>}
            </section>
          </div> : <div className="match-lineups-grid">
            {[['HEIMMANNSCHAFT',selectedMatch.home_team_id],['GASTMANNSCHAFT',selectedMatch.away_team_id]].map(([label,teamId])=>{const selectedLineups=lineups.filter(x=>String(x.match_id)===String(selectedMatch.id)&&String(x.team_id)===String(teamId));const squad=selectedLineups.map(x=>({...players.find(p=>String(p.id)===String(x.player_id)),...x})).filter(p=>p.id);return <section className="match-lineup-card" key={label}><span className="kicker">{label}</span><h2>{teamById(teamId)?.short_name||initials(teamById(teamId)?.name||'TEAM')} <small>{teamById(teamId)?.name}</small></h2><h3>Startelf</h3><div className="lineup-list">{squad.filter(p=>p.is_starting).map(p=><div className="lineup-player" key={p.id}><b>{p.shirt_number??'—'}</b><span>{p.full_name}</span><small>{p.position_slot||p.position||'Spieler'}</small></div>)}{!squad.some(p=>p.is_starting)&&<div className="empty-state">Startelf noch nicht veröffentlicht.</div>}</div><h3>Ersatzbank</h3><div className="lineup-list">{squad.filter(p=>!p.is_starting).map(p=><div className="lineup-player" key={p.id}><b>{p.shirt_number??'—'}</b><span>{p.full_name}</span><small>{p.position_slot||p.position||'Spieler'}</small></div>)}{!squad.some(p=>!p.is_starting)&&<div className="empty-state">Keine Ersatzspieler eingetragen.</div>}</div></section>})}
          </div>}
        </div>
      </main>}
      {tab==='admin' && <main className="container page-content"><div className="page-title"><span className="kicker">RESTRICTED AREA</span><h1>Admin dashboard</h1><p>Manage the league, publish results and keep the community up to date.</p></div>
        {!user||!isAdmin?<div className="empty-state">You need an authorised administrator account to access this page. <button className="inline-link" onClick={()=>setLoginOpen(true)}>Log in</button></div>:<div className="admin-panel">
          <div className="admin-head"><div><b>League management</b><small>Signed in as {user.email}</small></div><button className="outline-btn" onClick={logout}><LogOut size={15}/> Sign out</button></div>
          <div className="admin-tabs">{[['match','Fixtures'],['result','Results'],['goal','Goalscorers'],['team','Teams'],['player','Squads'],['lineup','Line-ups'],['report','Reports']].map(([id,label])=><button key={id} className={adminTab===id?'active':''} onClick={()=>setAdminTab(id)}>{label}</button>)}</div>
          {adminTab==='team'&&<form className="admin-form" onSubmit={addTeam}><h3>Add a team</h3><label>School / team name<input required value={newTeam.name} onChange={e=>setNewTeam({...newTeam,name:e.target.value})}/></label><label>Short name<input maxLength="5" value={newTeam.short_name} onChange={e=>setNewTeam({...newTeam,short_name:e.target.value.toUpperCase()})}/></label><label>Competition<select value={newTeam.group_name} onChange={e=>setNewTeam({...newTeam,group_name:e.target.value})}><option>U15 Boys</option><option>U15 Girls</option></select></label><button className="primary-btn"><Plus size={16}/> Mannschaft hinzufügen</button></form>}{adminTab==='team'&&adminDeleteList(teams.filter(t=>t.group_name===activeCompetition||!activeCompetition),'teams',t=>`${t.name} (${t.short_name||'ohne Kürzel'})`)}
          {adminTab==='match'&&<form className="admin-form" onSubmit={addMatch}><h3>Create a fixture</h3><label>Competition<select value={newMatch.competition} onChange={e=>setNewMatch({...newMatch,competition:e.target.value})}><option>U15 Boys</option><option>U15 Girls</option></select></label><div className="form-two"><label>Home team<select required value={newMatch.home_team_id} onChange={e=>setNewMatch({...newMatch,home_team_id:e.target.value})}><option value="">Select team</option>{teams.filter(t=>t.group_name===newMatch.competition).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Away team<select required value={newMatch.away_team_id} onChange={e=>setNewMatch({...newMatch,away_team_id:e.target.value})}><option value="">Select team</option>{teams.filter(t=>t.group_name===newMatch.competition).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div><div className="form-two"><label>Date<input type="date" required value={newMatch.match_date} onChange={e=>setNewMatch({...newMatch,match_date:e.target.value})}/></label><label>Kick-off<input type="time" value={newMatch.kickoff} onChange={e=>setNewMatch({...newMatch,kickoff:e.target.value})}/></label></div><button className="primary-btn"><Plus size={16}/> Spiel hinzufügen</button></form>}{adminTab==='match'&&adminDeleteList(matches,'matches',m=>`${teamById(m.home_team_id)?.short_name||teamById(m.home_team_id)?.name} – ${teamById(m.away_team_id)?.short_name||teamById(m.away_team_id)?.name} · ${fmtDate(m.match_date)}`)}
          {adminTab==='result'&&<form className="admin-form" onSubmit={saveResult}><h3>Enter match result</h3><label>Match<select required value={result.match_id} onChange={e=>setResult({...result,match_id:e.target.value})}><option value="">Select match</option>{matches.map(m=><option key={m.id} value={m.id}>{teamById(m.home_team_id)?.name} vs {teamById(m.away_team_id)?.name} · {fmtDate(m.match_date)}</option>)}</select></label><div className="form-two score-inputs"><label>Home score<input type="number" min="0" required value={result.home_score} onChange={e=>setResult({...result,home_score:e.target.value})}/></label><label>Away score<input type="number" min="0" required value={result.away_score} onChange={e=>setResult({...result,away_score:e.target.value})}/></label></div><button className="primary-btn"><CheckCircle2 size={16}/> Save result & update table</button></form>}
          {adminTab==='goal'&&<form className="admin-form" onSubmit={addGoal}><h3>Add a goalscorer</h3><label>Match<select required value={newGoal.match_id} onChange={e=>setNewGoal({...newGoal,match_id:e.target.value})}><option value="">Select match</option>{matches.filter(m=>m.status==='completed').map(m=><option key={m.id} value={m.id}>{teamById(m.home_team_id)?.name} vs {teamById(m.away_team_id)?.name}</option>)}</select></label><label>Team<select required value={newGoal.team_id} onChange={e=>setNewGoal({...newGoal,team_id:e.target.value})}><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="form-two"><label>Player name<input required value={newGoal.player_name} onChange={e=>setNewGoal({...newGoal,player_name:e.target.value})}/></label><label>Minute<input type="number" min="1" max="120" value={newGoal.minute} onChange={e=>setNewGoal({...newGoal,minute:e.target.value})}/></label></div><button className="primary-btn"><Plus size={16}/> Tor hinzufügen</button></form>}{adminTab==='goal'&&adminDeleteList(goals,'goals',g=>`${g.player_name} · ${g.minute||'?'}'`)}
          {adminTab==='player'&&<form className="admin-form" onSubmit={async e=>{e.preventDefault();const {error}=await supabase.from('players').insert({...newPlayer,shirt_number:newPlayer.shirt_number?Number(newPlayer.shirt_number):null});if(error)setNotice(error.message);else{setNewPlayer({team_id:'',full_name:'',shirt_number:'',position:''});setNotice('Player added to squad.');loadData();}}}><h3>Add player to squad</h3><label>Team<select required value={newPlayer.team_id} onChange={e=>setNewPlayer({...newPlayer,team_id:e.target.value})}><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Player name<input required value={newPlayer.full_name} onChange={e=>setNewPlayer({...newPlayer,full_name:e.target.value})}/></label><div className="form-two"><label>Shirt number<input type="number" min="1" max="99" value={newPlayer.shirt_number} onChange={e=>setNewPlayer({...newPlayer,shirt_number:e.target.value})}/></label><label>Position<input value={newPlayer.position} onChange={e=>setNewPlayer({...newPlayer,position:e.target.value})} placeholder="e.g. Forward"/></label></div><button className="primary-btn"><Plus size={16}/> Add player</button></form>}{adminTab==='player'&&adminDeleteList(players,'players',p=>`${p.full_name} · ${teamById(p.team_id)?.name||'Team'}`)}
          {adminTab==='lineup'&&<form className="admin-form" onSubmit={addLineup}><h3>Publish a match line-up</h3><label>Match<select required value={newLineup.match_id} onChange={e=>{const m=matches.find(x=>String(x.id)===e.target.value);setNewLineup({...newLineup,match_id:e.target.value,team_id:m?.home_team_id||''});}}><option value="">Select match</option>{matches.map(m=><option key={m.id} value={m.id}>{teamById(m.home_team_id)?.name} vs {teamById(m.away_team_id)?.name} · {fmtDate(m.match_date)}</option>)}</select></label><label>Team<select required value={newLineup.team_id} onChange={e=>setNewLineup({...newLineup,team_id:e.target.value,player_id:''})}><option value="">Select team</option>{teams.filter(t=>{const m=matches.find(x=>String(x.id)===String(newLineup.match_id));return m&&[String(m.home_team_id),String(m.away_team_id)].includes(String(t.id));}).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Player<select required value={newLineup.player_id} onChange={e=>setNewLineup({...newLineup,player_id:e.target.value})}><option value="">Select player</option>{players.filter(p=>String(p.team_id)===String(newLineup.team_id)).map(p=><option key={p.id} value={p.id}>{p.shirt_number?`#${p.shirt_number} `:''}{p.full_name}</option>)}</select></label><div className="form-two"><label>Position on team sheet<input value={newLineup.position_slot} onChange={e=>setNewLineup({...newLineup,position_slot:e.target.value})} placeholder="e.g. Goalkeeper, Left Wing"/></label><label>Selection<select value={newLineup.is_starting?'starting':'substitute'} onChange={e=>setNewLineup({...newLineup,is_starting:e.target.value==='starting'})}><option value="starting">Starting XI</option><option value="substitute">Substitute</option></select></label></div><button className="primary-btn"><Plus size={16}/> Zur Aufstellung hinzufügen</button></form>}{adminTab==='lineup'&&adminDeleteList(lineups,'match_lineups',l=>`${players.find(p=>String(p.id)===String(l.player_id))?.full_name||'Spieler'} · ${teamById(l.team_id)?.name||'Team'}`)}
          {adminTab==='report'&&<form className="admin-form" onSubmit={addReport}><h3>Publish a match report</h3><label>Title<input required value={newReport.title} onChange={e=>setNewReport({...newReport,title:e.target.value})}/></label><label>Competition<select value={newReport.competition} onChange={e=>setNewReport({...newReport,competition:e.target.value,match_id:''})}><option>U15 Boys</option><option>U15 Girls</option></select></label><label>Link to match<select value={newReport.match_id} onChange={e=>setNewReport({...newReport,match_id:e.target.value})}><option value="">Select match (optional)</option>{matches.filter(m=>m.competition===newReport.competition).map(m=><option key={m.id} value={m.id}>{teamById(m.home_team_id)?.name} vs {teamById(m.away_team_id)?.name} · {fmtDate(m.match_date)}</option>)}</select></label><label>Report<textarea required rows="6" value={newReport.body} onChange={e=>setNewReport({...newReport,body:e.target.value})}/></label><button className="primary-btn"><Newspaper size={16}/> Bericht veröffentlichen</button></form>}{adminTab==='report'&&adminDeleteList(reports,'reports',r=>r.title)}
        </div>}
      </main>}

      <footer className="site-footer"><div className="container footer-main"><div className="footer-brand"><img className="league-logo footer-logo" src="/assets/eenhana-school-league-logo.jpeg" alt="Eenhana School League"/></div><p>Developing talent. Building community.<br/>Celebrating school football in Eenhana, Namibia.</p><div className="footer-links">{nav.map(([id,label])=><button key={id} onClick={()=>go(id)}>{label}</button>)}</div></div><div className="container footer-bottom"><span>© 2027 Eenhana School League</span><span>MADE FOR THE LOVE OF THE GAME</span></div></footer>

      {loginOpen&&<div className="modal-backdrop" onClick={()=>setLoginOpen(false)}><div className="login-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setLoginOpen(false)}><X/></button><span className="modal-icon"><LockKeyhole/></span><span className="kicker">RESTRICTED ACCESS</span><h2>Admin login</h2><p>Sign in with your authorised league administrator account.</p><form onSubmit={login}><label>Email address<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Password<input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><button className="primary-btn">Sign in <ArrowUpRight size={16}/></button></form><small>Administrator accounts are created in Supabase. Public visitors do not need an account.</small></div></div>}
      <button className="refresh-fab" onClick={loadData} title="Refresh league data"><RefreshCw size={17}/></button>
    </div>
  );
}

export default App;
