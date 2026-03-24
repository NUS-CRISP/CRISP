import type { RepoNode } from '@shared/types/PeerReview';

// Utilities for Peer Review Feature

const parseGithubRepo = (repoUrl: string) => {
  const match = repoUrl.match(/github.com\/(.+?)\/(.+?)(?:$|\.|\/)/); // validate url
  if (!match) throw new Error('Invalid GitHub repository URL');
  return { owner: match[1], repo: match[2] };
};

const buildFetchRepoApiRoute = (owner: string, repo: string, commitOrTag?: string) => {
  const ref = commitOrTag || 'main';
  return `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
};

const buildFetchFileApiRoute = (owner: string, repo: string, path: string, commitOrTag?: string) => {
  const ref = commitOrTag || 'main';
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
};

// Function to fetch and parse GitHub repository structure
export const fetchGithubRepoStructure = async (
  repoUrl: string,
  commitOrTag?: string
): Promise<RepoNode> => {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const res = await fetch(buildFetchRepoApiRoute(owner, repo, commitOrTag));
  if (!res.ok) throw new Error('Failed to fetch repository structure');
  const data = await res.json();

  const root: RepoNode = {
    path: '',
    name: repo,
    type: 'directory',
    children: [],
  };
  const lookup: Record<string, RepoNode> = { '': root };

  data.tree.forEach((item: { path: string; type: 'blob' | 'tree' }) => {
    const parts = item.path.split('/');
    let current = root;
    let fullPath = '';
    parts.forEach((part: string, index: number) => {
      fullPath = fullPath ? `${fullPath}/${part}` : part;
      if (!lookup[fullPath]) {
        const node: RepoNode = {
          path: fullPath,
          name: part,
          type:
            index === parts.length - 1 && item.type === 'blob'
              ? 'file'
              : 'directory',
          children: [],
        };
        lookup[fullPath] = node;
        current.children!.push(node);
      }
      current = lookup[fullPath];
    });
  });
  return root;
};

// Function to fetch file content from GitHub
export const fetchFileContent = async (
  repoUrl: string,
  filePath: string,
  commitOrTag?: string
): Promise<string> => {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const res = await fetch(buildFetchFileApiRoute(owner, repo, filePath, commitOrTag));
  if (!res.ok) throw new Error('Failed to fetch file content');
  return await res.text();
};

// Function to flatten the RepoNode tree into a list of file paths
export const flattenTree = (node: RepoNode): string[] => {
  const out: string[] = [];
  const walk = (n: RepoNode) => {
    if (n.type === 'file') out.push(n.path);
    n.children?.forEach(child => walk(child));
  };
  walk(node);
  return out.sort();
};

// Function to get language mode for Monaco Editor based on file extension
export const getLanguageForFile = (filename: string) => {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop();

  switch (ext) {
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'c':
      return 'c';
    case 'cpp':
      return 'cpp';
    default:
      return 'plaintext';
  }
};
