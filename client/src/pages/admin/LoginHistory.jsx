// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';

export default function LoginHistory(){return <Workspace label="User administration" title="Account Login History"><div className="panel"><input placeholder="Search users"/><p>Login events must be recorded by the authentication backend before this page can display genuine history.</p></div></Workspace>}
