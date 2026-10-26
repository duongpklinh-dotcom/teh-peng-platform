import React,{useState} from 'react';
import {Link} from 'react-router-dom';
export default function Footer(){
 const [status,setStatus]=useState('Not checked');
 async function checkBackend(){setStatus('Checking...');try{const response=await fetch('/api/health');if(!response.ok)throw Error('Bad status');const data=await response.json();setStatus(data.message||'Backend available');}catch{setStatus('Cannot connect to backend');}}
 return <footer className="site-footer"><div><h2>Explore your next space.</h2><p>Find inspiration, discover designers, and plan your consultation.</p><Link className="pill light" to="/projects">Explore Projects ↗</Link></div><div className="footer-bottom"><strong>TEH PENG.</strong><span>Interior design discovery & portfolio platform</span><span>Student project · Demo content</span></div><div className="dev-health"><span>Development backend check: {status}</span><button type="button" onClick={checkBackend}>Check backend</button></div></footer>;
}
