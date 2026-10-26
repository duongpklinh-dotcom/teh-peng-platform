// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function About(){return <div className="page section"><span className="eyebrow">About us</span><h1>Design inspiration, all in one place.</h1><p>Teh Peng is a student-developed interior design discovery and portfolio platform. Customers explore design projects and connect with interior designers, while designers manage their work.</p><div className="steps-grid">{['Explore projects','Save inspiration','Book a consultation'].map((x,i)=><div className="step-card" key={x}><b>0{i+1}</b><h3>{x}</h3></div>)}</div></div>}
