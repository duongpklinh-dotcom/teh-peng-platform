// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';

export default function Categories(){return <Workspace label="Platform management" title="Manage IDP Categories"><div className="panel form-stack"><p>Current example categories: Residential, Commercial.</p><label>Category name<input placeholder="Category name"/></label><label>Description<textarea placeholder="Description"/></label><p className="muted">Category creation API is pending.</p></div></Workspace>}
