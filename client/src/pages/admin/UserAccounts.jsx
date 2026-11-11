// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';
import Workspace from '../../components/Workspace';
import AccountsNav from './AccountsNav';

export default function UserAccounts(){
  return (
    <Workspace label="User administration" title="User Accounts">
      <AccountsNav />
      <div className="panel">
        <p>Search accounts and unlock locked users. Requires real user data and protected admin APIs.</p>
        <input placeholder="Search users"/>
      </div>
    </Workspace>
  );
}