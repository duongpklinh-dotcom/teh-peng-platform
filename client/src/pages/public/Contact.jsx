// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function Contact(){return <div className="page section"><span className="eyebrow">Get in touch</span><h1>Contact Us</h1><p>For general platform enquiries. Designer consultations use the separate booking page.</p><div className="panel"><label>Name<input placeholder="Your name"/></label><label>Email<input type="email" placeholder="Email address"/></label><label>Message<textarea placeholder="Your enquiry"/></label><p className="muted">General enquiry submission is outside the currently selected implementation features.</p></div></div>}
