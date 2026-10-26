// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function ProjectDetails({onSave}){const {id}=useParams();const p=projects.find(x=>x.id===id);if(!p)return <div className="page section"><h1>Project unavailable</h1><Link to="/projects">Back to projects</Link></div>;return <div className="page section"><Link className="text-link" to="/projects">← Back to Projects</Link><span className="eyebrow">{p.category} · {p.style}</span><h1>{p.title}</h1><img className="detail-image" src={p.image} alt={p.title}/><div className="detail-columns"><div><h2>About this project</h2><p>{p.description}</p><p>Property type: {p.propertyType}</p><p>Designer: {p.designer}</p></div><div className="detail-aside"><h3>Explore this designer</h3><Link className="pill" to="/designers/studio-one">View Portfolio ↗</Link><button className="pill outline" onClick={()=>onSave(p.id)}>♡ Save to Favourites</button><Link className="pill" to={'/consultation?project='+p.id}>Book Consultation ↗</Link></div></div></div>}
