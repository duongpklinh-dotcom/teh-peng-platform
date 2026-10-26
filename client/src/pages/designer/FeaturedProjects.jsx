// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';

export default function FeaturedProjects(){const [selected,setSelected]=useState(projects.filter(p=>p.featured).map(p=>p.id));return <Workspace label="Interior designer" title="Feature Projects"><p>Select up to 3 projects to feature on your portfolio.</p><div className="panel form-stack">{projects.map(p=><label key={p.id} className="checkbox-row"><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(ids=>e.target.checked?(ids.length>=3?ids:[...ids,p.id]):ids.filter(x=>x!==p.id))}/>{p.title}</label>)}<p>Selected: {selected.length} / 3</p><button className="pill" onClick={()=>alert('Demo only — not saved to MongoDB')}>Save Featured Projects (demo)</button></div></Workspace>}
