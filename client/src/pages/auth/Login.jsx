// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function Login({register=false}){return <div className="page section"><span className="eyebrow">Account</span><h1>{register?'Register':'Login'}</h1><div className="panel form-stack"><label>Email<input type="email" placeholder="Email address"/></label><label>Password<input type="password" placeholder="Password"/></label><p className="muted">Authentication is not implemented in this frontend-only starter.</p><Link className="text-link" to={register?'/login':'/register'}>{register?'Already have an account? Login':'Create an account'}</Link></div></div>}
