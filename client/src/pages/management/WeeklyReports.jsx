// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';

export default function WeeklyReports(){return <Workspace label="Platform management" title="Weekly Reports"><div className="panel form-stack"><label>Week starting<input type="date"/></label><p>Summary metrics and report generation require agreed report definitions and database queries.</p></div></Workspace>}
