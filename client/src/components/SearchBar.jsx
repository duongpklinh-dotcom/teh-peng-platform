import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
export default function SearchBar(){
 const [term,setTerm]=useState('');const navigate=useNavigate();
 function submit(e){e.preventDefault();navigate('/projects'+(term.trim()?'?q='+encodeURIComponent(term.trim()):''));}
 return <form className="header-search" onSubmit={submit} role="search"><input aria-label="Search projects" placeholder="Search interior design projects..." value={term} onChange={e=>setTerm(e.target.value)}/><button type="submit" aria-label="Search projects">⌕</button></form>;
}
