
/*
 * US-02: Additional information for local sample projects.
 *
 * This file does not modify sampleProjects.js.
 * All profiles and descriptions are illustrative demo content.
 */

import { sampleProjects } from './sampleProjects';
import { projects as demoProjects } from './demo';

const allLocalProjects = [
  ...sampleProjects,
  ...demoProjects
];

const LOCAL_DESIGNER_PREFIX = 'sample-studio-';

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim() || fallback;
}

function formatStyle(style) {
  const value = cleanText(style, 'Contemporary');

  return value.charAt(0).toUpperCase() +
    value.slice(1);
}

function describeRoom(roomType) {
  const room = cleanText(roomType, 'interior space')
    .toLowerCase();

  if (room.includes('living')) {
    return 'a welcoming area for relaxing, entertaining and everyday family activities';
  }

  if (room.includes('bedroom')) {
    return 'a restful environment with a focus on comfort, storage and visual balance';
  }

  if (room.includes('kitchen')) {
    return 'a practical cooking environment with efficient layouts and convenient storage';
  }

  if (room.includes('dining')) {
    return 'an inviting space for shared meals and gatherings';
  }

  if (room.includes('bathroom')) {
    return 'a functional and comfortable space with carefully considered finishes';
  }

  if (room.includes('office') ||
      room.includes('workspace')) {
    return 'a productive environment supporting focused work and collaboration';
  }

  return 'a functional and visually cohesive interior';
}

function describeStyle(style) {
  const value = cleanText(style).toLowerCase();

  if (value.includes('scandinavian')) {
    return 'Light wood tones, soft neutral colours and simple furnishings reflect a Scandinavian-inspired aesthetic.';
  }

  if (value.includes('japandi')) {
    return 'Natural textures, understated details and balanced proportions reflect a Japandi-inspired aesthetic.';
  }

  if (value.includes('minimalist')) {
    return 'Clean lines, restrained colours and uncluttered arrangements create a minimalist atmosphere.';
  }

  if (value.includes('industrial')) {
    return 'Bold materials, contemporary furniture and exposed architectural details create an industrial-inspired atmosphere.';
  }

  if (value.includes('luxury')) {
    return 'Refined finishes, coordinated furnishings and carefully considered details create an elegant atmosphere.';
  }

  if (value.includes('contemporary')) {
    return 'Modern furnishings, comfortable layouts and coordinated finishes support a contemporary interior concept.';
  }

  return 'Clean architectural details and practical furnishings contribute to a modern interior concept.';
}

export function getLocalProjectById(id) {
  return allLocalProjects.find(
    project => project.id === id
  ) || null;
}

export function getLocalDesignerPath(designerName) {
  const name = cleanText(designerName);

  if (!name) {
    return null;
  }

  return `/designers/${encodeURIComponent(
    LOCAL_DESIGNER_PREFIX + name
  )}`;
}

export function getSampleProjectDetails(project) {
  if (!project) {
    return null;
  }

  const style = formatStyle(project.style);

  const propertyType = cleanText(
    project.propertyType,
    'Residential'
  );

  const roomType = cleanText(
    project.roomType,
    'Interior'
  );

  const studioName = cleanText(
    project.designer,
    'Sample Design Studio'
  );

  const description = [
    `This illustrative ${style.toLowerCase()} interior concept explores the design of a ${roomType.toLowerCase()} space within a ${propertyType.toLowerCase()} property.`,
    `The proposed design focuses on ${describeRoom(roomType)}.`,
    describeStyle(style)
  ].join(' ');

  const images = Array.isArray(project.images) &&
    project.images.length
      ? project.images
      : project.image
        ? [project.image]
        : [];

  return {
    ...project,
    description:
      cleanText(project.description) || description,
    style,
    propertyType,
    roomType,
    images,
    image: project.image || images[0] || '',
    isSample: true,
    isDemo: true,
    projectStatus:
      cleanText(project.projectStatus) ||
      'Design concept',
    designerId: null,
    designer: studioName,

    designerInfo: {
      name: studioName,
      profileDescription:
        `${studioName} is a fictional studio identity used to organise the sample interior design portfolio. The showcased concepts demonstrate a range of design styles, room layouts and property types.`,
      specialisation:
        'Illustrative residential and commercial interior concepts',
      portfolioPath:
        getLocalDesignerPath(studioName)
    },

    companyInfo: {
      companyName: studioName,
      companyDescription:
        `${studioName} is a sample portfolio studio used for this university project. Its featured images and design concepts are presented for demonstration purposes.`,
      specialisation:
        'Interior Design Concepts',
      location: 'Singapore',
      isDemo: true
    }
  };
}

export function getLocalRelatedProjects(project, limit = 6) {
  if (!project) {
    return [];
  }

  return allLocalProjects
    .filter(item =>
      item.id !== project.id &&
      item.designer === project.designer
    )
    .slice(0, limit)
    .map(getSampleProjectDetails);
}

export function getLocalDesignerPortfolio(designerRouteId) {
  if (
    typeof designerRouteId !== 'string' ||
    !designerRouteId.startsWith(LOCAL_DESIGNER_PREFIX)
  ) {
    return null;
  }

  const studioName = designerRouteId.slice(
    LOCAL_DESIGNER_PREFIX.length
  );

  const projects = allLocalProjects
    .filter(item =>
      item.designer === studioName
    )
    .map(getSampleProjectDetails);

  if (!projects.length) {
    return null;
  }

  const firstProject = projects[0];

  const designStyles = [
    ...new Set(
      projects
        .map(project => project.style)
        .filter(Boolean)
    )
  ];

  return {
    isSample: true,

    designer: {
      id: designerRouteId,
      name: studioName,
      profileDescription:
        firstProject.designerInfo.profileDescription,
      specialisation:
        designStyles.length
          ? `${designStyles.join(', ')} interior concepts`
          : 'Interior design concepts'
    },

    company: firstProject.companyInfo,

    projects
  };
}