
import {
  pipeline,
  RawImage
} from '@huggingface/transformers';

import projectEmbeddingData from '../data/projectEmbeddings.json';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

// Load CLIP once per browser session.
let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      'image-feature-extraction',
      MODEL_ID,
      { device: 'wasm' }
    ).catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
}

// Compare two numerical image embeddings.
function cosineSimilarity(first, second) {
  if (first.length !== second.length) {
    throw new Error(
      'The image embeddings have different dimensions.'
    );
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let i = 0; i < first.length; i++) {
    dotProduct += first[i] * second[i];
    firstMagnitude += first[i] * first[i];
    secondMagnitude += second[i] * second[i];
  }

  const denominator =
    Math.sqrt(firstMagnitude) *
    Math.sqrt(secondMagnitude);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

// Compare the uploaded image against saved project embeddings.
export async function findSimilarProjects(
  uploadedFile,
  projects
) {
  if (
    !uploadedFile ||
    !uploadedFile.type.startsWith('image/')
  ) {
    throw new Error('Please upload a valid image file.');
  }

  if (projectEmbeddingData.model !== MODEL_ID) {
    throw new Error(
      'The saved project embeddings use a different AI model.'
    );
  }

  const extractor = await getExtractor();

  // The AI model processes only the uploaded photograph.
  const uploadedImageURL = URL.createObjectURL(uploadedFile);

  let uploadedEmbedding;

  try {
    const image = await RawImage.read(uploadedImageURL);
    const output = await extractor(image);

    uploadedEmbedding = Array.from(output.data);
  } finally {
    URL.revokeObjectURL(uploadedImageURL);
  }

  const comparisons = [];

  // Compare against the precomputed project vectors.
  for (const project of projects) {
    const savedEmbedding =
      projectEmbeddingData.embeddings[project.image];

    if (!savedEmbedding) {
      console.warn(
        `No precomputed embedding for ${project.title}`
      );
      continue;
    }

    const similarity = cosineSimilarity(
      uploadedEmbedding,
      savedEmbedding
    );

    comparisons.push({
      project,
      similarity
    });
  }

  if (comparisons.length === 0) {
    throw new Error(
      'No matching project embeddings were found.'
    );
  }

  // Highest cosine similarity first.
  comparisons.sort(
    (a, b) => b.similarity - a.similarity
  );

  return comparisons;
}