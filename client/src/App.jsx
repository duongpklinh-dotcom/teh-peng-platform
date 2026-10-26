import React,{useState} from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/public/Home';
import About from './pages/public/About';
import ExploreProjects from './pages/public/ExploreProjects';
import ProjectDetails from './pages/public/ProjectDetails';
import InteriorDesigners from './pages/public/InteriorDesigners';
import DesignerPortfolio from './pages/public/DesignerPortfolio';
import Contact from './pages/public/Contact';
import MyAccount from './pages/customer/MyAccount';
import MyFavourites from './pages/customer/MyFavourites';
import MyConsultations from './pages/customer/MyConsultations';
import BookConsultation from './pages/customer/BookConsultation';
import ProfileSettings from './pages/customer/ProfileSettings';
import Login from './pages/auth/Login';
import MyProjects from './pages/designer/MyProjects';
import EditProject from './pages/designer/EditProject';
import FeaturedProjects from './pages/designer/FeaturedProjects';
import Categories from './pages/management/Categories';
import WeeklyReports from './pages/management/WeeklyReports';
import UserAccounts from './pages/admin/UserAccounts';
import LoginHistory from './pages/admin/LoginHistory';
import {demoRoles} from './data/demo';

export default function App(){
 const [role,setRole]=useState('guest');
 const [saved,setSaved]=useState([]);
 // Demonstration only; replace with customer-specific authenticated API requests.
 function onSave(id){if(role==='guest'){alert('Please log in to save projects. Authentication is not implemented yet.');return;}setSaved(ids=>ids.includes(id)?ids:[...ids,id]);alert('Added to demo favourites');}
 return <BrowserRouter>
  <Navbar role={role} setRole={setRole}/>
  <main id="main-content"><Routes>
   <Route path="/" element={<Home/>}/>
   <Route path="/about" element={<About/>}/>
   <Route path="/projects" element={<ExploreProjects onSave={onSave}/>}/>
   <Route path="/projects/:id" element={<ProjectDetails onSave={onSave}/>}/>
   <Route path="/designers" element={<InteriorDesigners/>}/>
   <Route path="/designers/:id" element={<DesignerPortfolio/>}/>
   <Route path="/contact" element={<Contact/>}/>
   <Route path="/consultation" element={<BookConsultation/>}/>
   <Route path="/login" element={<Login/>}/>
   <Route path="/register" element={<Login register/>}/>
   <Route path="/account" element={<MyAccount/>}/>
   <Route path="/account/favourites" element={<MyFavourites saved={saved} setSaved={setSaved}/>}/>
   <Route path="/account/consultations" element={<MyConsultations/>}/>
   <Route path="/account/profile" element={<ProfileSettings/>}/>
   <Route path="/designer/projects" element={<MyProjects/>}/>
   <Route path="/designer/projects/:id/edit" element={<EditProject/>}/>
   <Route path="/designer/featured" element={<FeaturedProjects/>}/>
   <Route path="/management/categories" element={<Categories/>}/>
   <Route path="/management/reports" element={<WeeklyReports/>}/>
   <Route path="/admin/accounts" element={<UserAccounts/>}/>
   <Route path="/admin/login-history" element={<LoginHistory/>}/>
   <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main>
  <Footer/>
  <div className="role-preview"><label htmlFor="role">Design preview role</label><select id="role" value={role} onChange={e=>setRole(e.target.value)}>{demoRoles.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
 </BrowserRouter>;
}
