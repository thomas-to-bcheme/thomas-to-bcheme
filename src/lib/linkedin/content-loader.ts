/**
 * LinkedIn Content Loader
 *
 * Parses markdown files with YAML frontmatter from genAI/linkedin-posts/
 * Frontmatter schema: date, topic, target_audience
 */
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface LinkedInPostMetadata {
  date: string; // YYYY-MM-DD
  topic: string;
  target_audience: string;
}

export interface LinkedInPostContent {
  metadata: LinkedInPostMetadata;
  content: string;
  filename: string;
}

const POSTS_DIR = path.join(process.cwd(), 'genAI', 'linkedin-posts');

/**
 * Load a single post by filename (without .md extension)
 */
export async function loadPost(
  filename: string
): Promise<LinkedInPostContent | null> {
  // Sanitize filename to prevent path traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(POSTS_DIR, `${sanitizedFilename}.md`);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);

    return {
      metadata: {
        date: data.date || '',
        topic: data.topic || '',
        target_audience: data.target_audience || '',
      },
      content: content.trim(),
      filename: sanitizedFilename,
    };
  } catch {
    return null;
  }
}

/**
 * List all available posts sorted by date (newest first)
 */
export async function listAvailablePosts(): Promise<LinkedInPostContent[]> {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const posts: LinkedInPostContent[] = [];
    for (const file of mdFiles) {
      const post = await loadPost(file.replace('.md', ''));
      if (post) posts.push(post);
    }

    // Sort by date descending (newest first)
    return posts.sort(
      (a, b) =>
        new Date(b.metadata.date).getTime() -
        new Date(a.metadata.date).getTime()
    );
  } catch {
    return [];
  }
}
