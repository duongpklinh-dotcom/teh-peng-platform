// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';

export default function EditProject(){const {id}=useParams();const p=projects.find(x=>x.id===id);return <Workspace label="Interior designer" title="Edit Project Details">{!p?<p>Project not found.</p>:<form className="panel form-stack" onSubmit={e=>{e.preventDefault();alert('Demo only — not saved to MongoDB')}}><label>Project title<input defaultValue={p.title}/></label><label>Description<textarea defaultValue={p.description}/></label><label>Category<input defaultValue={p.category}/></label><label>Style<input defaultValue={p.style}/></label><button className="pill">Save Changes (demo)</button><Link to="/designer/projects">Cancel</Link></form>}</Workspace>}
