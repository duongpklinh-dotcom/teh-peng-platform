// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function MyConsultations(){return <div className="page section"><span className="eyebrow">Customer account</span><h1>My Consultations</h1><p>Booking history will appear here once the consultation API is implemented.</p></div>}
