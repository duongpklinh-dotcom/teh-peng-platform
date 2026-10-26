// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function MyAccount(){return <div className="page section"><span className="eyebrow">Customer account</span><h1>My Account</h1><div className="category-grid"><Link className="category-card" to="/account/favourites">My Favourites ↗</Link><Link className="category-card" to="/account/consultations">My Consultations ↗</Link><Link className="category-card" to="/account/profile">Profile Settings ↗</Link></div></div>}
