// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function DesignerPortfolio(){return <div className="page section"><span className="eyebrow">Designer portfolio</span><h1>Studio One</h1><p>Illustrative interior designer profile. Company information and featured projects will be loaded from the backend.</p><SectionHeading eyebrow="Portfolio" title="Featured Projects"/><div className="project-grid">{projects.filter(p=>p.featured).map(p=><ProjectCard key={p.id} project={p}/>)}</div><Link className="pill" to="/consultation">Book Consultation ↗</Link></div>}
