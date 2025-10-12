import { useState } from 'react';
import { RepoNode } from '@shared/types/PeerReview';
import { NavLink } from '@mantine/core';
import { IconFileText, IconFolder, IconFolderOpen } from '@tabler/icons-react';

type PeerReviewFileTreeProps = {
  repoNode: RepoNode;
  currFile: string;
  openFile: (filePath: string) => void;
  level?: number;
};

const PeerReviewFileTree: React.FC<PeerReviewFileTreeProps> = ({
  repoNode,
  currFile,
  openFile,
  level = 0,
}) => {
  const [openDirs, setOpenDirs] = useState<{ [path: string]: boolean }>({});

  if (repoNode.type === 'file') {
    return (
      <NavLink
        label={repoNode.name}
        leftSection={<IconFileText size={16} />}
        active={repoNode.path === currFile}
        onClick={() => openFile(repoNode.path)}
        style={{ paddingLeft: `${level * 16}px` }}
      />
    );
  }

  const isOpen = openDirs[repoNode.path] ?? false;
  return (
    <>
      <NavLink
        label={repoNode.name || 'root'}
        leftSection={
          isOpen ? (
            <IconFolderOpen size={16} style={{ marginLeft: '10px' }} />
          ) : (
            <IconFolder size={16} style={{ marginLeft: '10px' }} />
          )
        }
        onClick={() =>
          setOpenDirs(prev => ({ ...prev, [repoNode.path]: !isOpen }))
        }
        style={{ paddingLeft: `${level * 16}px` }}
      />
      {isOpen &&
        repoNode.children?.map(child => (
          <PeerReviewFileTree
            key={child.path}
            repoNode={child}
            currFile={currFile}
            openFile={openFile}
            level={level + 1}
          />
        ))}
    </>
  );
};

export default PeerReviewFileTree;
