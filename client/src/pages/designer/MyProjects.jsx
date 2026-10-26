// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';

export default function MyProjects(){return <Workspace label="Interior designer" title="My Projects"><div className="panel"><table><thead><tr><th>Project</th><th>Category</th><th>Featured</th><th>Action</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td>{p.title}</td><td>{p.category}</td><td>{p.featured?'Yes':'No'}</td><td><Link to={'/designer/projects/'+p.id+'/edit'}>Edit</Link></td></tr>)}</tbody></table></div></Workspace>}
