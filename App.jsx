import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from './supabase';
import { Pencil, Trash2, Plus, X, Shield, Trophy, CalendarDays, Users, Goal, LogIn, LogOut, RefreshCw, ChevronRight } from 'lucide-react';

const competitions = ['U15 Boys', 'U15 Girls'];
const empty = { teams: [], matches: [], players: [], goals: [], events: [], lineups: [], reports: [] };
const dateLabel = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'Date TBC';
const initials = s => (s || '?').split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();

export default function App() {
  const [data,setData] = useState(empty);
  const [competition,setCompetition] = useState('U15 Boys');
  const [page,setPage] = useState('home');
  const [selectedMatch,setSelectedMatch] = useState(null);
  const [selectedTeam,setSelectedTeam] = useState(null);
  const [session,setSession] = useState(null);
  const [isAdmin,setIsAdmin] = useState(false);
  const [login,setLogin] = useState(false);
  const [credentials,setCredentials] = useState({email:'',password:''});
  const [editor,setEditor] = useState(null);
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [eventTableAvailable,setEventTableAvailable] = useState(true);

  async function refresh() {
    if (!isConfigured) return;
    setBusy(true);
    const tables = ['teams','matches','players','goals','match_events','match_lineups','reports'];
    const results = await Promise.all(tables.map(t => supabase.from(t).select('*')));
    const next = {...empty};
    tables.forEach((t,i)=>{
      if (t==='match_events' && results[i].error) { setEventTableAvailable(false); return; }
      if (results[i].error) setNotice(`Datenbankfehler (${t}): ${results[i].error.message}`);
      else next[t==='match_events'?'events':t] = results[i].data || [];
    });
    next.matches.sort((a,b)=>`${a.match_date} ${a.kickoff||''}`.localeCompare(`${b.match_date} ${b.kickoff||''}`));
    setData(next); setBusy(false);
  }
  useEffect(()=>{
    if (!isConfigured) return;
    refresh();
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>listener.subscription.unsubscribe();
  },[]);
  useEffect(()=>{ (async()=>{
    if (!session?.user) { setIsAdmin(false); return; }
    const {data,error}=await supabase.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
    setIsAdmin(!error && !!data);
  })(); },[session]);

  const teams = data.teams.filter(t=>t.group_name===competition);
  const matches = data.matches.filter(m=>m.competition===competition);
  const team = id=>data.teams.find(t=>String(t.id)===String(id));
  const roster = id=>data.players.filter(p=>String(p.team_id)===String(id));
  const standings = useMemo(()=>{
    const rows=teams.map(t=>({team:t,P:0,W:0,D:0,L:0,GF:0,GA:0,PTS:0}));
    const map=Object.fromEntries(rows.map(r=>[String(r.team.id),r]));
    matches.filter(m=>m.status==='completed' && m.home_score!=null && m.away_score!=null).forEach(m=>{
      const h=map[String(m.home_team_id)],a=map[String(m.away_team_id)]; if(!h||!a)return;
      const x=+m.home_score,y=+m.away_score; h.P++;a.P++;h.GF+=x;h.GA+=y;a.GF+=y;a.GA+=x;
      if(x>y){h.W++;h.PTS+=3;a.L++;}else if(x<y){a.W++;a.PTS+=3;h.L++;}else{h.D++;a.D++;h.PTS++;a.PTS++;}
    });
    return rows.sort((a,b)=>b.PTS-a.PTS||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);
  },[teams,matches]);

  async function save(table,id,values) {
    if(!isAdmin)return;
    const clean={...values}; delete clean.id; delete clean.created_at;
    const {error}=id ? await supabase.from(table).update(clean).eq('id',id) : await supabase.from(table).insert(clean);
    if(error){setNotice(error.message);return;}
    setEditor(null);setNotice('Gespeichert.');await refresh();
  }
  async function remove(table,item,label) {
    if(!isAdmin)return;
    const typed=window.prompt(`Zum Löschen von „${label}“ bitte exakt LÖSCHEN eingeben.`);
    if(typed!=='LÖSCHEN')return;
    const {error}=await supabase.from(table).delete().eq('id',item.id);
    if(error){setNotice(error.message);return;} setNotice('Eintrag gelöscht.');await refresh();
  }
  async function signIn(e){e.preventDefault();const {error}=await supabase.auth.signInWithPassword(credentials);if(error)setNotice(error.message);else setLogin(false);}
  const editButton=(table,item,label,fields)=><div className="row-actions">{isAdmin&&<><button title="Bearbeiten" onClick={()=>setEditor({table,item,fields})}><Pencil size={16}/></button><button title="Löschen" onClick={()=>remove(table,item,label)}><Trash2 size={16}/></button></>}</div>;
  const openEdit=(table,item,fields)=>setEditor({table,item,fields});
  const matchCard=m=><article className="match-card" key={m.id}>
    <button className="match-open" onClick={()=>{setSelectedMatch(m);setPage('match')}}><small>{dateLabel(m.match_date)} · {m.kickoff||'TBA'} · {m.status==='completed'?'FULL TIME':'FIXTURE'}</small><div className="match-score"><span><b>{team(m.home_team_id)?.short_name||team(m.home_team_id)?.name||'Home'}</b><small>{team(m.home_team_id)?.name}</small></span><strong>{m.status==='completed'?`${m.home_score} : ${m.away_score}`:'VS'}</strong><span className="away"><b>{team(m.away_team_id)?.short_name||team(m.away_team_id)?.name||'Away'}</b><small>{team(m.away_team_id)?.name}</small></span></div></button>
    {editButton('matches',m,'Spiel', [{key:'match_date',label:'Datum',type:'date'},{key:'kickoff',label:'Anstoß',type:'time'},{key:'competition',label:'Wettbewerb',type:'select',options:competitions},{key:'home_team_id',label:'Heimteam',type:'select',options:data.teams.map(t=>[t.id,t.name])},{key:'away_team_id',label:'Auswärtsteam',type:'select',options:data.teams.map(t=>[t.id,t.name])},{key:'home_score',label:'Heimtore',type:'number'},{key:'away_score',label:'Auswärtstore',type:'number'},{key:'status',label:'Status',type:'select',options:['scheduled','completed','postponed','cancelled']}])}
  </article>;

  const fieldEditor=()=>editor&&<div className="overlay" onClick={()=>setEditor(null)}><form className="dialog" onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const vals={};editor.fields.forEach(f=>{let v=fd.get(f.key);if(f.type==='number')v=v===''?null:Number(v);if(v!==null)vals[f.key]=v;});save(editor.table,editor.item?.id,vals);}} onClick={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setEditor(null)}><X/></button><h2>{editor.item?'Eintrag bearbeiten':'Eintrag hinzufügen'}</h2>{editor.fields.map(f=><label key={f.key}>{f.label}{f.type==='select'?<select name={f.key} defaultValue={editor.item?.[f.key]??''} required><option value="">Bitte wählen</option>{f.options.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}</select>:f.type==='textarea'?<textarea name={f.key} defaultValue={editor.item?.[f.key]??''}/>:<input name={f.key} type={f.type||'text'} defaultValue={editor.item?.[f.key]??''} required={f.required!==false}/>}</label>)}<div className="dialog-actions"><button type="button" className="secondary" onClick={()=>setEditor(null)}>Abbrechen</button><button className="primary">Speichern</button></div></form></div>;

  const teamFields=[{key:'name',label:'Teamname'},{key:'short_name',label:'Kurzname'},{key:'group_name',label:'Wettbewerb',type:'select',options:competitions}];
  const playerFields=[{key:'team_id',label:'Team',type:'select',options:data.teams.map(t=>[t.id,t.name])},{key:'full_name',label:'Name'},{key:'shirt_number',label:'Rückennummer',type:'number',required:false},{key:'position',label:'Position',required:false}];
  const matchFields=[{key:'match_date',label:'Datum',type:'date'},{key:'kickoff',label:'Anstoß',type:'time',required:false},{key:'competition',label:'Wettbewerb',type:'select',options:competitions},{key:'home_team_id',label:'Heimteam',type:'select',options:data.teams.map(t=>[t.id,t.name])},{key:'away_team_id',label:'Auswärtsteam',type:'select',options:data.teams.map(t=>[t.id,t.name])}];

  return <div className="app">
    <div className="topline">THE HOME OF SCHOOL FOOTBALL IN EENHANA <span>SEASON 2027 · U15 BOYS & GIRLS</span></div>
    <header><button className="brand" onClick={()=>{setPage('home');setSelectedTeam(null);setSelectedMatch(null)}}><img src="/logo.jpeg" onError={e=>{e.currentTarget.src='/eenhana-school-league-logo.jpeg'}} alt="Eenhana School League"/><span>Eenhana<br/>School League</span></button><nav><button onClick={()=>setPage('home')}>Start</button><button onClick={()=>setPage('fixtures')}>Spielplan</button><button onClick={()=>setPage('table')}>Tabelle</button><button onClick={()=>setPage('teams')}>Teams</button></nav><div className="header-right">{isAdmin?<button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Abmelden</button>:<button onClick={()=>setLogin(true)}><LogIn size={16}/> Admin</button>}</div></header>
    <div className="competition-tabs">{competitions.map(c=><button className={competition===c?'active':''} onClick={()=>{setCompetition(c);setSelectedMatch(null);setSelectedTeam(null);setPage('home')}} key={c}>{c}</button>)}</div>
    {notice&&<div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
    {!eventTableAvailable&&<div className="notice">Die Ereignis-Tabelle match_events ist noch nicht verfügbar. Bitte migration-match-events.sql in Supabase ausführen.</div>}
    <main>
      {page==='home'&&<><section className="hero"><p>OFFICIAL COMPETITION · SEASON 2027</p><h1>ONE LEAGUE.<br/><em>ONE COMMUNITY.</em></h1><p>School football. Local pride. Future stars.</p><div className="hero-buttons"><button onClick={()=>setPage('fixtures')}>Spielplan ansehen <ChevronRight/></button><button className="outline" onClick={()=>setPage('table')}>Tabelle</button></div></section><section className="stats"><div><Shield/><b>{teams.length}</b><small>TEAMS</small></div><div><CalendarDays/><b>{matches.length}</b><small>MATCHES</small></div><div><Goal/><b>{data.goals.filter(g=>team(g.team_id)?.group_name===competition).length+data.events.filter(g=>['goal','penalty','own_goal'].includes(g.event_type)&&team(g.team_id)?.group_name===competition).length}</b><small>GOALS</small></div><div><Users/><b>U15</b><small>BOYS & GIRLS</small></div></section><div className="columns"><section><div className="section-title"><h2>Letzte Ergebnisse</h2><button onClick={()=>setPage('fixtures')}>Alle anzeigen →</button></div>{matches.filter(m=>m.status==='completed').slice(-4).reverse().map(matchCard)}{!matches.some(m=>m.status==='completed')&&<p className="empty">Noch keine Ergebnisse veröffentlicht.</p>}</section><section><div className="section-title"><h2>Nächste Spiele</h2><button onClick={()=>setPage('fixtures')}>Alle anzeigen →</button></div>{matches.filter(m=>m.status!=='completed').slice(0,4).map(matchCard)}{!matches.some(m=>m.status!=='completed')&&<p className="empty">Noch keine Spiele angesetzt.</p>}</section></div></>}
      {page==='fixtures'&&<><div className="page-title"><p>{competition}</p><h1>Spielplan & Ergebnisse</h1>{isAdmin&&<button className="primary" onClick={()=>openEdit('matches',null,matchFields)}><Plus/> Spiel hinzufügen</button>}</div>{matches.map(matchCard)}{!matches.length&&<p className="empty">Für diesen Wettbewerb gibt es noch keine Spiele.</p>}</>}
      {page==='table'&&<><div className="page-title"><p>{competition}</p><h1>Ligatabelle</h1></div><div className="table-scroll"><table><thead><tr><th>#</th><th>Team</th><th>Sp</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Diff.</th><th>Pkt.</th>{isAdmin&&<th/>}</tr></thead><tbody>{standings.map((r,i)=><tr key={r.team.id}><td>{i+1}</td><td><button className="team-link" onClick={()=>{setSelectedTeam(r.team);setPage('team')}}>{r.team.name}</button></td><td>{r.P}</td><td>{r.W}</td><td>{r.D}</td><td>{r.L}</td><td>{r.GF}:{r.GA}</td><td>{r.GF-r.GA}</td><td><b>{r.PTS}</b></td>{isAdmin&&<td>{editButton('teams',r.team,r.team.name,teamFields)}</td>}</tr>)}</tbody></table>{!standings.length&&<p className="empty">Noch keine Teams angelegt.</p>}</div></>}
      {page==='teams'&&<><div className="page-title"><p>{competition}</p><h1>Teams & Kader</h1>{isAdmin&&<button className="primary" onClick={()=>openEdit('teams',null,teamFields)}><Plus/> Team hinzufügen</button>}</div><div className="team-grid">{teams.map(t=><article className="team-card" key={t.id}><button onClick={()=>{setSelectedTeam(t);setPage('team')}}><span>{initials(t.short_name||t.name)}</span><b>{t.name}</b><small>{roster(t.id).length} Spieler · Teamprofil</small></button>{editButton('teams',t,t.name,teamFields)}</article>)}</div>{!teams.length&&<p className="empty">Noch keine Teams eingetragen.</p>}</>}
      {page==='team'&&selectedTeam&&<><button className="back" onClick={()=>setPage('teams')}>← Zurück zu Teams</button><div className="page-title"><p>{selectedTeam.group_name}</p><h1>{selectedTeam.name}</h1>{editButton('teams',selectedTeam,selectedTeam.name,teamFields)}</div><div className="section-title"><h2>Kader</h2>{isAdmin&&<button onClick={()=>openEdit('players',null,[{...playerFields[0],options:data.teams.filter(t=>t.group_name===competition).map(t=>[t.id,t.name])},...playerFields.slice(1)])}><Plus/> Spieler hinzufügen</button>}</div><div className="table-scroll"><table><thead><tr><th>Nr.</th><th>Name</th><th>Position</th>{isAdmin&&<th/>}</tr></thead><tbody>{roster(selectedTeam.id).map(p=><tr key={p.id}><td>{p.shirt_number||'—'}</td><td>{p.full_name}</td><td>{p.position||'—'}</td>{isAdmin&&<td>{editButton('players',p,p.full_name,playerFields)}</td>}</tr>)}</tbody></table>{!roster(selectedTeam.id).length&&<p className="empty">Noch keine Spieler eingetragen.</p>}</div></>}
      {page==='match'&&selectedMatch&&<><button className="back" onClick={()=>setPage('fixtures')}>← Zurück zum Spielplan</button><div className="match-detail"><p>{competition} · {dateLabel(selectedMatch.match_date)} · {selectedMatch.kickoff||'TBA'}</p><div><b>{team(selectedMatch.home_team_id)?.short_name||team(selectedMatch.home_team_id)?.name}</b><strong>{selectedMatch.status==='completed'?`${selectedMatch.home_score} : ${selectedMatch.away_score}`:'VS'}</strong><b>{team(selectedMatch.away_team_id)?.short_name||team(selectedMatch.away_team_id)?.name}</b></div>{isAdmin&&editButton('matches',selectedMatch,'Spiel', [...matchFields,{key:'home_score',label:'Heimtore',type:'number',required:false},{key:'away_score',label:'Auswärtstore',type:'number',required:false},{key:'status',label:'Status',type:'select',options:['scheduled','completed','postponed','cancelled']}])}</div><div className="section-title"><h2>Spielereignisse</h2>{isAdmin&&eventTableAvailable&&<button onClick={()=>openEdit('match_events',null,[{key:'match_id',label:'Spiel',type:'select',options:[[selectedMatch.id,`${team(selectedMatch.home_team_id)?.name} – ${team(selectedMatch.away_team_id)?.name}`]]},{key:'team_id',label:'Team',type:'select',options:[ [selectedMatch.home_team_id,team(selectedMatch.home_team_id)?.name],[selectedMatch.away_team_id,team(selectedMatch.away_team_id)?.name] ]},{key:'player_name',label:'Spieler',required:false},{key:'event_type',label:'Ereignis',type:'select',options:['goal','penalty','own_goal','yellow_card','red_card','substitution']},{key:'minute',label:'Minute',type:'number',required:false},{key:'details',label:'Details (optional)',required:false}])}><Plus/> Ereignis hinzufügen</button>}</div>{data.events.filter(e=>String(e.match_id)===String(selectedMatch.id)).sort((a,b)=>(a.minute||0)-(b.minute||0)).map(e=><div className="event-row" key={e.id}><b>{e.minute?`${e.minute}'`:'—'}</b><span>{({goal:'Tor',penalty:'Elfmeter',own_goal:'Eigentor',yellow_card:'Gelbe Karte',red_card:'Rote Karte',substitution:'Auswechslung'})[e.event_type]||e.event_type} · {e.player_name||'—'} {e.details&&`(${e.details})`}</span>{editButton('match_events',e,'Spielereignis',[{key:'team_id',label:'Team',type:'select',options:[[selectedMatch.home_team_id,team(selectedMatch.home_team_id)?.name],[selectedMatch.away_team_id,team(selectedMatch.away_team_id)?.name]]},{key:'player_name',label:'Spieler',required:false},{key:'event_type',label:'Ereignis',type:'select',options:['goal','penalty','own_goal','yellow_card','red_card','substitution']},{key:'minute',label:'Minute',type:'number',required:false},{key:'details',label:'Details',required:false}])}</div>)}{!data.events.some(e=>String(e.match_id)===String(selectedMatch.id))&&<p className="empty">Noch keine Ereignisse eingetragen.</p>}</>}
    </main>
    <footer>© 2027 Eenhana School League · Eenhana, Namibia</footer>
    {login&&<div className="overlay" onClick={()=>setLogin(false)}><form className="dialog" onSubmit={signIn} onClick={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setLogin(false)}><X/></button><h2>Admin Login</h2><label>E-Mail<input type="email" required value={credentials.email} onChange={e=>setCredentials({...credentials,email:e.target.value})}/></label><label>Passwort<input type="password" required value={credentials.password} onChange={e=>setCredentials({...credentials,password:e.target.value})}/></label><button className="primary">Anmelden</button></form></div>}
    {fieldEditor()}
    <button className="refresh" onClick={refresh} title="Daten aktualisieren"><RefreshCw size={17}/></button>
  </div>;
}
