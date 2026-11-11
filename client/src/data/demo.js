
 // Placeholder project data.
 // Replace with the team's Express API when integration is ready.

export const projects = [
  {
    id: 'p1',
    title: 'Urban Apartment',
    style: 'Modern',
    propertyType: 'Apartment',
    category: 'Residential',
    designer: 'Test Designer',
    designerId: '6adfdb222ce3e5f09a648b5f',
    company: 'Studio One',
    image: '/assets/caa8b.webp',
    description:
      'A warm, functional city apartment with thoughtful details.',
    featured: true
  },
  {
    id: 'p2',
    title: 'Calm Living Spaces',
    style: 'Minimalist',
    propertyType: 'Condominium',
    category: 'Residential',
    designer: 'Design Atelier',
    designerId: null,
    company: 'Design Atelier',
    image: '/assets/41d0a.webp',
    description:
      'A light-filled living space with clean lines.',
    featured: true
  },
  {
    id: 'p3',
    title: 'Contemporary Workspace',
    style: 'Contemporary',
    propertyType: 'Office',
    category: 'Commercial',
    designer: 'Studio One',
    designerId: null,
    company: 'Studio One',
    image: '/assets/90760.webp',
    description:
      'Flexible workspaces designed for collaboration.',
    featured: false
  }
];

export const demoRoles = [
  'guest',
  'customer',
  'designer',
  'management',
  'admin'
];
