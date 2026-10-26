import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
// Role selection is a DEMO ONLY. No authentication or authorization is implemented.
const menu={
 guest:[['Login','/login'],['Register','/register']],
 customer:[['My Account','/account'],['My Favourites','/account/favourites'],['My Consultations','/account/consultations'],['Profile Settings','/account/profile']],
 designer:[['My Projects','/designer/projects'],['Featured Projects','/designer/featured'],['View My Portfolio','/designers/studio-one'],['Profile Settings','/account/profile']],
 management:[['Manage IDP Categories','/management/categories'],['Weekly Reports','/management/reports']],
 admin:[['User Accounts','/admin/accounts'],['Login History','/admin/login-history']]
};
export default function AccountDropdown({role,setRole}){
 const [open,setOpen]=useState(false);const navigate=useNavigate();
 return <div className="account-menu"><button type="button" className="account-toggle" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-haspopup="true">◯ {role==='guest'?'Login / Register':'My Account'} ▾</button>{open&&<div className="dropdown"><small>{role==='guest'?'Guest':`Preview role: ${role}`}</small>{menu[role].map(([label,to])=><Link key={to} onClick={()=>setOpen(false)} to={to}>{label}</Link>)}{role!=='guest'&&<button type="button" onClick={()=>{setRole('guest');setOpen(false);navigate('/')}}>Logout (preview)</button>}</div>}</div>;
}
