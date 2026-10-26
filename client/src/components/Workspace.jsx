import React from 'react';
export default function Workspace({label,title,children}){return <div className="page section"><span className="eyebrow">{label}</span><h1>{title}</h1>{children}</div>}
