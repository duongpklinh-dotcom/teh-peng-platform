
/*
 * US-01: Sample Interior Design Projects
 *
 * 50 fictional interior design projects for demonstrating
 * keyword search, autocomplete, filtering and sorting.
 *
 * Images are stored in client/public/projects/.
 * Budgets, dates and project details are sample data.
 */

const projectData = [
  // Modern & Contemporary
  ['Urban Serenity', 'modern hdb living room.jpg', 'Modern', 'HDB', 'Living Room'],
  ['The Metropolitan Loft', 'modern apartment living room.jpg', 'Modern', 'Apartment', 'Living Room'],
  ['Monochrome Haven', 'modern condo.jpg', 'Modern', 'Condominium', 'Living Room'],
  ['Cityscape Residence', 'contemporary condo living room.jpg', 'Contemporary', 'Condominium', 'Living Room'],
  ['The Glasshouse', 'modern landed home.jpg', 'Modern', 'Landed', 'Living Room'],
  ['Elegance in Grey', 'modern bedroom.jpg', 'Modern', 'Condominium', 'Bedroom'],
  ['Refined Living', 'contemporary dining room.jpg', 'Contemporary', 'Apartment', 'Dining Room'],
  ['The Marble Suite', 'modern bathroom.jpg', 'Modern', 'Condominium', 'Bathroom'],
  ['Urban Culinary Studio', 'modern kitchen.jpg', 'Modern', 'HDB', 'Kitchen'],
  ['The Executive Space', 'contemporary office.jpg', 'Contemporary', 'Office', 'Office'],

  // Scandinavian & Japandi
  ['The Nordic Retreat', 'Scandinavian living room.jpg', 'Scandinavian', 'HDB', 'Living Room'],
  ['Oakwood Residence', 'Scandinavian bedroom.jpg', 'Scandinavian', 'Apartment', 'Bedroom'],
  ['Soft Nordic Living', 'Scandinavian HDB.jpg', 'Scandinavian', 'HDB', 'Living Room'],
  ['White Birch House', 'Scandinavian kitchen.jpg', 'Scandinavian', 'Condominium', 'Kitchen'],
  ['Nordic Harmony', 'Scandinavian dining room.jpg', 'Scandinavian', 'Apartment', 'Dining Room'],
  ['Zenwood Residence', 'Japandi living room.jpg', 'Japandi', 'Condominium', 'Living Room'],
  ['Wabi-Sabi Haven', 'Japandi bedroom.jpg', 'Japandi', 'HDB', 'Bedroom'],
  ['The Tranquil Home', 'Japandi apartment.jpg', 'Japandi', 'Apartment', 'Living Room'],
  ['Natural Balance', 'Japandi kitchen.jpg', 'Japandi', 'HDB', 'Kitchen'],
  ['Quiet Moments', 'Japandi bathroom.jpg', 'Japandi', 'Condominium', 'Bathroom'],

  // Minimalist & Warm Neutral
  ['Pure Simplicity', 'Minimalist living room.jpg', 'Minimalist', 'HDB', 'Living Room'],
  ['The Calm Residence', 'Minimalist bedroom.jpg', 'Minimalist', 'Apartment', 'Bedroom'],
  ['Ivory Haven', 'Minimalist condo.jpg', 'Minimalist', 'Condominium', 'Living Room'],
  ['Warmth and Light', 'Minimalist warm living room.jpg', 'Minimalist', 'HDB', 'Living Room'],
  ['The Neutral Palette', 'apartment interior (beige).jpg', 'Minimalist', 'Apartment', 'Living Room'],
  ['Soft Living', 'Minimalist dining room.jpg', 'Minimalist', 'Condominium', 'Dining Room'],
  ['Less Is More', 'Minimalist kitchen.jpg', 'Minimalist', 'HDB', 'Kitchen'],
  ['Serene Sanctuary', 'Minimalist bathroom.jpg', 'Minimalist', 'Apartment', 'Bathroom'],
  ['The Open Plan', 'open-concept home.jpg', 'Minimalist', 'Landed', 'Living Room'],
  ['The Quiet Studio', 'minimalist home office.jpg', 'Minimalist', 'Apartment', 'Office'],

  // Industrial & Bold
  ['The Industrial Loft', 'Industrial living room.jpg', 'Industrial', 'Apartment', 'Living Room'],
  ['Concrete and Steel', 'Industrial kitchen.jpg', 'Industrial', 'Apartment', 'Kitchen'],
  ['The Brickhouse', 'exposed brick living room.jpg', 'Industrial', 'Landed', 'Living Room'],
  ['Urban Edge', 'Industrial bedroom.jpg', 'Industrial', 'Condominium', 'Bedroom'],
  ['The Workshop', 'Industrial office.jpg', 'Industrial', 'Office', 'Office'],
  ['Dark Elegance', 'dark modern living room.jpg', 'Modern', 'Condominium', 'Living Room'],
  ['The Charcoal Suite', 'dark bedroom.jpg', 'Modern', 'Apartment', 'Bedroom'],
  ['Raw Materials', 'concrete interior.jpg', 'Industrial', 'Landed', 'Living Room'],
  ['The Creative Hub', 'creative workspace.jpg', 'Contemporary', 'Office', 'Office'],
  ['Modern Contrast', 'black and white kitchen.jpg', 'Modern', 'HDB', 'Kitchen'],

  // Luxury & Family Living
  ['The Grand Residence', 'Luxury condo.jpg', 'Contemporary', 'Condominium', 'Living Room'],
  ['Golden Hour Living', 'Luxury living room.jpg', 'Contemporary', 'Landed', 'Living Room'],
  ['The Family Haven', 'family living room.jpg', 'Modern', 'HDB', 'Living Room'],
  ['The Garden Residence', 'landed house interior.jpg', 'Modern', 'Landed', 'Living Room'],
  ['Timeless Elegance', 'Luxury dining room.jpg', 'Contemporary', 'Landed', 'Dining Room'],
  ['The Master Retreat', 'Luxury bedroom.jpg', 'Contemporary', 'Condominium', 'Bedroom'],
  ['Heritage Modern', 'modern classic living room.jpg', 'Modern', 'Landed', 'Living Room'],
  ['The Entertainer Home', 'open kitchen dining.jpg', 'Contemporary', 'Apartment', 'Kitchen'],
  ['The Penthouse Collection', 'penthouse interior.jpg', 'Contemporary', 'Condominium', 'Living Room'],
  ['The Executive Retreat', 'Luxury home office.jpg', 'Contemporary', 'Landed', 'Office']
];

const descriptions = [
  'A carefully designed interior featuring balanced materials and functional spaces.',
  'A welcoming renovation that combines practical layouts with elegant finishes.',
  'A thoughtfully planned space with modern furnishings and comfortable living areas.',
  'A stylish interior that emphasises natural lighting and cohesive design.',
  'A refined renovation with carefully selected textures, colours and materials.'
];

const statuses = ['completed', 'ongoing', 'planned'];

export const sampleProjects = projectData.map(
  ([title, filename, style, propertyType, roomType], index) => {
    const image = `/projects/${encodeURIComponent(filename)}`;

    const estimatedBudget =
      20000 + ((index * 13700) % 180000);

    const createdAt = new Date(
      Date.UTC(2024, 0, 1 + index * 14)
    ).toISOString();

    const designer = `Sample Design Studio ${(index % 10) + 1}`;

    return {
      id: `sample-${String(index + 1).padStart(3, '0')}`,
      title,
      description: descriptions[index % descriptions.length],
      style,
      propertyType,
      roomType,
      projectStatus: statuses[index % statuses.length],
      estimatedBudget,
      createdAt,
      category: propertyType === 'Office'
        ? 'Commercial'
        : 'Residential',
      designer,
      company: designer,
      image,
      images: [image],
      featured: index % 8 === 0,
      isPublished: true,
      isSample: true
    };
  }
);