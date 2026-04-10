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
  const [isOpen, setIsOpen] = useState(level === 0);

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
        onClick={() => setIsOpen(prev => !prev)}
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
