// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function InteriorDesigners(){return <div className="page section"><span className="eyebrow">Our designers</span><h1>Interior Designers</h1><div className="project-grid"><div className="project-card"><img src="/assets/41d0a.webp" alt="Designer portfolio"/><div className="project-card-copy"><h3>Studio One</h3><p>Demo designer profile</p><Link className="text-link" to="/designers/studio-one">View Portfolio ↗</Link></div></div></div></div>}
