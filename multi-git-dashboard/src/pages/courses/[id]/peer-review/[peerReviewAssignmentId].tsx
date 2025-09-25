import {
  Container,
  Center,
  ScrollArea,
  Group,
  Title,
  Anchor,
  Stack,
  Text,
  Divider,
  Box,
  Card,
  Button,
  Textarea,
} from '@mantine/core';
import { createPortal } from "react-dom";
import { IconListDetails, IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { PeerReview, PeerReviewAssignment, PeerReviewComment, RepoNode } from '@shared/types/PeerReview';
import PeerReviewCommentWidget from '@/components/peer-review/PeerReviewCommentWidget';
import PeerReviewFileTree from '@/components/peer-review/PeerReviewFileTree';
import { User } from '@shared/types/User';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import classes from '@styles/PeerReview.module.css';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

/* ----- Local Storage for Comments ----- */
const LOCAL_CACHE_KEY = (peerReviewId: string) => `peerReviewComments_${peerReviewId}`;

const loadCachedComments = (peerReviewId: string): PeerReviewComment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY(peerReviewId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveCachedComments = (peerReviewId: string, comments: PeerReviewComment[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY(peerReviewId), JSON.stringify(comments));
  } catch {
    // Ignore write errors
  }
};

/* ----- Fetch Repo and Files ----- */
  
// Function to parse GitHub repo URL
const parseGithubRepo = (repoUrl: string) => {
  const match = repoUrl.match(/github.com\/(.+?)\/(.+?)(?:$|\.|\/)/); // validate url
  if (!match) throw new Error('Invalid GitHub repository URL');
  return { owner: match[1], repo: match[2] };
};

const buildFetchRepoApiRoute = (owner: string, repo: string) => {
  return `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`
}

const buildFetchFileApiRoute = (owner: string, repo: string, path: string) => {
  return `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
}

// Function to fetch and parse GitHub repository structure
const fetchGithubRepoStructure = async (repoUrl: string): Promise<RepoNode> => {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const res = await fetch(buildFetchRepoApiRoute(owner, repo));
  if (!res.ok) throw new Error('Failed to fetch repository structure');
  const data = await res.json();
  
  const root: RepoNode = { path: '', name: repo, type: 'directory', children: [] };
  const lookup: Record<string, RepoNode> = { '': root };
  
  data.tree.forEach((item: any) => {
    const parts = item.path.split('/');
    let current = root;
    let fullPath = '';
    parts.forEach((part: string, index: number) => {
      fullPath = fullPath ? `${fullPath}/${part}` : part;
      if (!lookup[fullPath]) {
        const node: RepoNode = {
          path: fullPath,
          name: part,
          type: index === parts.length - 1 && item.type === 'blob' ? 'file' : 'directory',
          children: [],
        };
        lookup[fullPath] = node;
        current.children!.push(node);
      }
      current = lookup[fullPath];
    })});
  return root;
};

// Function to fetch file content from GitHub
const fetchFileContent = async (repoUrl: string, filePath: string): Promise<string> => {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const res = await fetch(buildFetchFileApiRoute(owner, repo, filePath));
  if (!res.ok) throw new Error('Failed to fetch file content');
  return await res.text();
};

// Placeholder function to fetch peer review data
const apiFetchPeerReviewAssignment = async (peerReviewAssignmentId: string): Promise<PeerReviewAssignment> => {
  // TODO: Replace with actual API call
  return {
    _id: peerReviewAssignmentId,
    peerReviewId: 'peerReview123',
    repoName: 'Sample Peer Review',
    repoUrl: 'https://github.com/gongg21/AddSubtract.git',
    reviewerUser: null,
    reviewerTeam: null,
    reviewee: null,
    assignedBy: null,
    assignedAt: new Date(),
    deadline: null,
    status: "Pending",
  };
};

/* ----- Comments API Calls ----- */

// Function to fetch comments for a peer review (simulated)
// TODO: Replace with actual API call => GET /api/peerreviews/:id/comments
const apiFetchComments = async (peerReviewId: string): Promise<PeerReviewComment[]> => {
  // For demo, load from local storage
  return loadCachedComments(peerReviewId);
};

// Function to save a new comment (simulated)
// TODO: Replace with actual API call => POST /api/peerreviews/:id/comments
const apiSaveComment = async (peerReviewId: string, comment: Omit<PeerReviewComment, '_id' | 'createdAt'>): Promise<PeerReviewComment> => {
  const saved: PeerReviewComment = {
    ... comment,
    _id: Math.random().toString(36).substring(2, 15), // Random ID for demo
    createdAt: new Date(),
  };
  const existing = loadCachedComments(peerReviewId);
  const next = [...existing, saved];
  saveCachedComments(peerReviewId, next);
  return saved;
};

// Function to delete a comment (simulated)
// TODO: Replace with actual API call => DELETE /api/peerreviews/:id/comments/:commentId
const apiDeleteComment = async (peerReviewId: string, commentId: string): Promise<void> => {
  const existing = loadCachedComments(peerReviewId);
  const next = existing.filter(c => c._id !== commentId);
  saveCachedComments(peerReviewId, next);
};

/* ----- Helper Functions ----- */

const flattenTree = (node: RepoNode): string[] => {
  const out: string[] = [];
  const walk = (n: RepoNode) => {
    if (n.type === 'file') out.push(n.path);
    n.children?.forEach(child => walk(child));
  };
  walk(node);
  return out.sort();
}

const getLanguageForFile = (filename: string) => {
  if (!filename) return "plaintext";
  const ext = filename.split(".").pop();

  switch (ext) {
    case "js": return "javascript";
    case "ts": return "typescript";
    case "tsx": return "typescript";
    case "jsx": return "javascript";
    case "json": return "json";
    case "css": return "css";
    case "html": return "html";
    case "md": return "markdown";
    case "py": return "python";
    case "java": return "java";
    case "c": return "c";
    case "cpp": return "cpp";
    default: return "plaintext";
  }
};

/* ----- FE Component ----- */

const PeerReviewDetail: React.FC = () => {
  const router = useRouter();
  const { id, peerReviewAssignmentId } = router.query as {
    id: string;
    peerReviewAssignmentId: string;
  };
  
  const [loading, setLoading] = useState<boolean>(true);
  
  // Repo and Files
  const [peerReviewAssignment, setPeerReviewAssignment] = useState<PeerReviewAssignment | null>(null);
  const [repoTree, setRepoTree] = useState<RepoNode | null>(null);
  const [currFile, setCurrFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  
  // Comments
  const [allComments, setAllComments] = useState<PeerReviewComment[]>([]);
  const [overallComment, setOverallComment] = useState<string>('');
  
  // Monaco Editor Refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  
  // Current User
  const { data: session } = useSession();
  const currentUser: User = session?.user as User
  
  // Load Peer Review, Repo Structure, Initial File, and Comments
  const load = useCallback(async () => {
    if (!peerReviewAssignmentId) return;
    setLoading(true);
    
    try {
      const selectedPeerReviewAssignment = await apiFetchPeerReviewAssignment(peerReviewAssignmentId);
      const tree = await fetchGithubRepoStructure(selectedPeerReviewAssignment.repoUrl);
      const currComments = await apiFetchComments(peerReviewAssignmentId);
      setPeerReviewAssignment(selectedPeerReviewAssignment);
      setRepoTree(tree);
      setAllComments(currComments);
      
      // Load initial file content if available
      const files = flattenTree(tree);
      if (files[0]) {
        setCurrFile(files[0]);
        const content = await fetchFileContent(selectedPeerReviewAssignment.repoUrl, files[0]);
        setFileContent(prev => ({ ...prev, [files[0]]: content }));
      }
    } finally {
      setLoading(false);
    }
  }, [peerReviewAssignmentId]);
  
  useEffect(() => {
    if (router.isReady) load();
  }, [router.isReady, load]);
  
  // Open File Logic
  const openFile = useCallback(async (filePath: string) => {
    if (!peerReviewAssignment) return;
    setCurrFile(filePath);
    if (!fileContent[filePath]) {
      const content = await fetchFileContent(peerReviewAssignment.repoUrl, filePath);
      setFileContent(prev => ({ ...prev, [filePath]: content }));
    }
  }, [peerReviewAssignment, fileContent]);
  
  // Editor Interaction Logic
  const [activeWidget, setActiveWidget] = useState<{
    start: number;
    end: number;
    top: number;
  } | null>(null);
  
  const [activeDecorationIds, setActiveDecorationIds] = useState<string[]>([]);
  const activeWidgetRef = useRef<typeof activeWidget>(null);
  const hoverDecoRef = useRef<string[]>([]);
  
  useEffect(() => {
    activeWidgetRef.current = activeWidget;
  }, [activeWidget]);
  
  // Rendering Logic Functions
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    let startLine: number | null = null;
    let dragDecos: string[] = [];
    
    editor.onMouseMove((e: any) => {
      // If comment widget is active, disable hover effects
      if (activeWidgetRef.current) {
        if (hoverDecoRef.current.length > 0) {
          hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
          hoverDecoRef.current = [];
        }
        return;
      };
      
      // Drag logic
      if (startLine !== null && e.target.position) {
        const line = e.target.position.lineNumber;
        const start = Math.min(startLine, line);
        const finish = Math.max(startLine, line);
        
        const decos = [];
        for (let l = start; l <= finish; l++) {
          decos.push({
            range: new monaco.Range(l, 1, l, 1),
            options: {
              isWholeLine: true,
              className: classes.commentedRange,
              glyphMarginClassName: classes.addCommentIcon,
            }
          });
        }
        dragDecos = editor.deltaDecorations(dragDecos, decos);
        return;
      }
      
      // Hover logic
      if (e.target?.position) {
        const line = e.target.position.lineNumber;
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, [{
          range: new monaco.Range(line, 1, line, 1),
          options: { 
            glyphMarginClassName: classes.addCommentIcon,
          }
        }]);
      } else {
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
      }
    });
    
    // Selecting lines to comment
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        startLine = e.target.position.lineNumber;
        hoverDecoRef.current = editor.deltaDecorations(hoverDecoRef.current, []);
        dragDecos = editor.deltaDecorations(dragDecos, []);
      } else {
        startLine = null;
      }
    });
    
    // Finalise selection and open comment widget
    editor.onMouseUp((e: any) => {
      if (startLine === null) return
      
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        dragDecos = editor.deltaDecorations(dragDecos, []);
        startLine = null;
        return;
      };
      
      const endLine = e.target.position.lineNumber;
      const start = Math.min(startLine, endLine);
      const finish = Math.max(startLine, endLine);
      
      const decos = [];
      for (let l = start; l <= finish; l++) {
        decos.push({
          range: new monaco.Range(l, 1, l, 1),
          options: {
            isWholeLine: true,
            className: classes.commentedRange,
            glyphMarginClassName: classes.addCommentIcon,
          }
        });
      }
      dragDecos = editor.deltaDecorations(dragDecos, decos);
      
      setActiveDecorationIds(dragDecos);
      
      // Open comment widget
      const top = editor.getTopForLineNumber(finish);
      setActiveWidget({ start, end: finish, top });
      startLine = null;
    });
  }
  
  // Handle Save Comment
  const handleSaveComment = async (c: Omit<PeerReviewComment, '_id' | 'createdAt' | 'updatedAt'>, cleanup: () => void) => {
    const saved = await apiSaveComment(peerReviewAssignmentId, c);
    setAllComments(prev => [...prev, saved]);
    cleanup();
    setActiveWidget(null);
  }
  
  // Handle Cancel Comment
  const handleCancelComment = () => {
    if (editorRef.current) {
      
      // Clear highlights
      if (activeDecorationIds.length > 0) {
        editorRef.current.deltaDecorations(activeDecorationIds, []);
        setActiveDecorationIds([]);
      }
      
      // Clear hover decorations
      if (hoverDecoRef.current.length > 0) {
        editorRef.current.deltaDecorations(hoverDecoRef.current, []);
        hoverDecoRef.current = [];
      }
      
      setActiveWidget(null); // close comment widget
    }
  }
  
  // Update decorations when comments or file change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !currFile) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    
    const fileComments = allComments.filter(c => c.filePath === currFile);
    const newDecorations = fileComments.map(c => ({
      range: new monaco.Range(c.startLine, 1, c.endLine, 1),
      options: {
        isWholeLine: true,
        className: classes.commentedRange,
        hoverMessage: { value: `**${c.author.name}**: ${c.comment}` },
      }
    }));
    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  }, [allComments, currFile]);

  if (loading || !peerReviewAssignment || !repoTree) {
    return (
      <Center>Loading...</Center>
    );
  }
  
  const code = currFile ? fileContent[currFile] || '// Loading file content...' : '// No file selected';
  
  return (
    <Container fluid className={classes.wrapper} style={{ padding: 20, maxWidth: '100%' }}>
      <Group style={{ paddingBottom:"5px", marginBottom: '5px', display: 'flex', alignContent: 'flex-start', maxHeight: '90%', }} >
        <IconArrowLeft onClick={() => router.push(`/courses/${id}/peer-review`)} className={classes.returnButton} />
        <IconListDetails />
        <Title order={4}>Peer Review:</Title>
        <Anchor href={peerReviewAssignment.repoUrl} target="_blank" rel="noreferrer">
          <Title order={4}>
            {peerReviewAssignment.repoName}
          </Title>
        </Anchor>
      </Group>

      <Group align="flex-start" gap="xs">
        {currFile ? (
          <Box style={{ flex: 1, minWidth: 0}}>
            <Card withBorder radius="md">
              <Group style={{ height: "3vh", justifyContent: "space-between", marginBottom: "4px", }}>
                <Text style={{ fontWeight: 'bold', fontFamily: "ui-monospace" }}>{currFile}</Text>
              </Group>
              <Divider mb="sm" />
              <MonacoEditor
                height="65vh"
                path={currFile}
                language={getLanguageForFile(currFile)}
                theme="vs-dark"
                value={code}
                options={{
                  readOnly: true,
                  lineHeight: 20,
                  lineNumbers: "on",
                  glyphMargin: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                }}
                onMount={handleEditorMount}
              />
            </Card>
          </Box>
        ) : (
          <Center mih={300}>
            <Text>Select a file to view</Text>
          </Center>
        )}
        
        <ScrollArea className={classes.repositoryScrollArea} scrollbarSize={4}>
          <Stack>
            <Text className={classes.repositoryText}>
              Repository
            </Text>
            { repoTree && 
              <PeerReviewFileTree 
                repoNode={repoTree}
                currFile={currFile!}
                openFile={openFile}
              />
            }
          </Stack>
        </ScrollArea>
      </Group>
      
      <Card withBorder mt="xs">
        <Textarea
          placeholder="Leave your overall review comment..."
          autosize
          minRows={2}
          value={overallComment}  
          onChange={(e) => setOverallComment(e.currentTarget.value)}
        />
        <Group mt="xs" justify="flex-end">
          <Button
            onClick={() => {
              alert(`Review submitted: ${overallComment}`);
              setOverallComment("");
            }}
          >
            Submit review
          </Button>
        </Group>
      </Card>
      
      {/* Portal Injection for Comment Box */}
      { activeWidget && createPortal(
          <div className={classes.commentWidget} style={{ top: activeWidget.top + 50 }}>
            <PeerReviewCommentWidget
              startLine={activeWidget.start}
              endLine={activeWidget.end}
              currFile={currFile!}
              peerReviewAssignmentId={peerReviewAssignmentId}
              currUser={currentUser}
              onSave={handleSaveComment}
              onCancel={handleCancelComment}
            />
          </div>,
          document.getElementById("monaco-widgets-root")!
      )}
    </Container>
  );
};

export default PeerReviewDetail;
