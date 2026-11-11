
import { pipeline, RawImage } from '@huggingface/transformers';
import {
  readdir,
  mkdir,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

// Run this script from the client folder.
const projectFolder = path.resolve('public/projects');
const outputFolder = path.resolve('src/data');
const outputFile = path.join(
  outputFolder,
  'projectEmbeddings.json'
);

const supportedExtensions = /\.(jpg|jpeg|png|webp)$/i;

async function main() {
  console.log('Loading CLIP AI model...');

  const extractor = await pipeline(
    'image-feature-extraction',
    MODEL_ID,
    { device: 'cpu' }
  );

  const filenames = (await readdir(projectFolder))
    .filter((filename) => supportedExtensions.test(filename))
    .sort();

  if (filenames.length === 0) {
    throw new Error('No project photographs were found.');
  }

  console.log(`Found ${filenames.length} project images.`);

  const embeddings = {};

  for (let index = 0; index < filenames.length; index++) {
    const filename = filenames[index];
    const fullPath = path.join(projectFolder, filename);

    console.log(
      `Processing ${index + 1}/${filenames.length}: ${filename}`
    );

    const image = await RawImage.read(fullPath);
    const output = await extractor(image);

    if (!output.data || output.data.length !== 512) {
      throw new Error(
        `Unexpected embedding size for ${filename}: ` +
        `${output.data?.length}`
      );
    }

    // Use exactly the same URL format as sampleProjects.js.
    const imagePath = `/projects/${encodeURIComponent(filename)}`;

    embeddings[imagePath] = Array.from(output.data);
  }

  await mkdir(outputFolder, { recursive: true });

  await writeFile(
    outputFile,
    JSON.stringify({
      model: MODEL_ID,
      embeddings
    }, null, 2),
    'utf8'
  );

  console.log('');
  console.log(`Successfully processed ${filenames.length} images.`);
  console.log(`Saved embeddings to: ${outputFile}`);
}

main().catch((error) => {
  console.error('Embedding generation failed:', error);
  process.exitCode = 1;
});
