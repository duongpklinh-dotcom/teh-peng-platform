// UI scaffold adapted from the supplied Figma Make template; demo data until APIs are connected.
import React, {useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {projects} from '../../data/demo';
import ProjectCard from '../../components/ProjectCard';

export default function BookConsultation(){const [params]=useSearchParams();const p=projects.find(x=>x.id===params.get('project'));const [done,setDone]=useState(false);return <div className="page section"><span className="eyebrow">Connect with a designer</span><h1>Book Consultation</h1><p>{p?`Project: ${p.title} · Designer: ${p.designer}`:'Select your preferred designer and share your requirements.'}</p>{done?<div className="panel">Demo request recorded in this browser only. No booking was submitted to a server.</div>:<form className="panel form-stack" onSubmit={e=>{e.preventDefault();setDone(true)}}><label>Name<input required placeholder="Full name"/></label><label>Email<input type="email" required placeholder="Email address"/></label><label>Preferred date<input type="date" required/></label><label>Preferred time<input type="time" required/></label><label>Requirements<textarea placeholder="Tell us about your project"/></label><button className="pill">Submit (demo only)</button></form>}</div>}

/*
 * FEATURE: US #103 — Book a Consultation
 * OWNER: Book Consultation feature teammate
 *
 * BCE BOUNDARY CLASS: ConsultationGUI
 * Existing React component: BookConsultation
 *
 * BCE ATTRIBUTES:
 * - customerId
 * - designerId
 * - selectedSlotId
 * - preferredTime
 * - renovationRequirements
 *
 * BCE BOUNDARY METHODS:
 * - displayRecommendedSlots(slots)
 * - displayConfirmation(requestId)
 * - displayRequestStatus(requestStatus)
 * - showError(message)
 *
 * BACKEND:
 * - ConsultationController.js
 * - TimeSlot.js
 * - ConsultationRequest.js
 *
 * TODO FOR FEATURE OWNER:
 * 1. Replace demo booking with real API calls.
 * 2. Identify customer from existing authentication.
 * 3. Retrieve and display ranked available time slots.
 * 4. Allow customer to select a slot.
 * 5. Submit consultation request with selectedSlotId.
 * 6. Display confirmation using the returned requestId.
 * 7. Allow customer to retrieve requestStatus.
 * 8. Handle unavailable slots and scheduling conflicts.
 *
 * IMPORTANT:
 * - Reuse existing User accounts for customers/designers.
 * - Do not create another authentication system.
 * - Preserve existing Figma styling.
 * - Follow the approved BCE and sequence diagrams.
 */
