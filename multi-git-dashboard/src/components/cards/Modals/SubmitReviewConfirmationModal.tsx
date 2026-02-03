import React, { useMemo, useState } from 'react';
import {
  Modal,
  Group,
  Text,
  Button,
  Badge,
  ScrollArea,
  Stack,
  Divider,
  Code,
  Checkbox,
  Collapse,
} from '@mantine/core';
import { IconSend, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { PeerReviewComment } from '@shared/types/PeerReview';

type SubmitReviewConfirmationModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  comments: PeerReviewComment[];
  submitting?: boolean;
  locked?: boolean;
  repoName?: string;
};

type FileGroup = {
  filePath: string;
  items: PeerReviewComment[];
};

const SubmitReviewConfirmationModal: React.FC<SubmitReviewConfirmationModalProps> = ({
  opened,
  onClose,
  onConfirm,
  comments,
  submitting = false,
  locked = false,
  repoName,
}) => {
  const [ack, setAck] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  
  const { fileGroups, totalComments, totalFiles } = useMemo(() => {
    const map = new Map<string, PeerReviewComment[]>();
    comments.forEach((comment) => {
      const key = comment.filePath ?? '(unknown)';
      map.set(key, [...(map.get(key) || []), comment]);
    });
    const groups: FileGroup[] = [...map.entries()]
      .map(([filePath, items]) => ({
        filePath,
        items: [...items].sort((a, b) => (a.startLine ?? 0) - (b.startLine ?? 0)),
      }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath));
    
    return {
      fileGroups: groups,
      totalComments: comments.length,
      totalFiles: groups.length,
    };
  }, [comments]);
  
  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => ({ ...prev, [filePath]: !prev[filePath] }) );
  }
  
  const canSubmit = !locked && ack && !submitting && totalComments > 0;
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap='xs' wrap='nowrap'>
          <Text fw={700}>Submit Peer Review for</Text>
          {repoName && <Badge radius='md' color="green">{repoName}</Badge>}
        </Group>
      }
      size='xl'
      centered
    >
      <Stack gap='sm'>
        <Group gap='xs'>
          <Badge variant='' radius='md' color={totalFiles > 0 ? 'blue' : 'gray'}>
            {totalFiles} file{totalFiles === 1 ? '' : 's'}
          </Badge>
          <Badge variant='' radius='md' color={totalComments > 0 ? 'blue' : 'gray'}>
            {totalComments} comment{totalComments === 1 ? '' : 's'}
          </Badge>
          {locked && <Badge variant='filled' radius='md' color='dark'>Locked</Badge>}
        </Group>
        <Text size='sm' c='dimmed'>
          Review the comments below. After submitting, you will not be able to make further changes.
        </Text>
        <Divider />
        {totalComments === 0 ? (
          <Text size='sm' c='dimmed'>
            No comments to submit.
          </Text>
        ) : (
          <ScrollArea h={320} type='hover' scrollbarSize={6} offsetScrollbars>
            <Stack gap='xs'>
              {fileGroups.map((group) => {
                const expanded = expandedFiles[group.filePath] ?? false;
                return (
                  <Stack key={group.filePath} gap={6}>
                    <Group
                      justify='space-between'
                      align='center'
                      onClick={() => toggleFile(group.filePath)}
                      style={{ cursor: 'pointer' }}
                      wrap='nowrap'
                      mb={4}
                    >
                      <Group gap='xs' wrap='nowrap'>
                        {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        <Code>{group.filePath}</Code>
                      </Group>
                      <Badge variant='light' radius='md'>
                        {group.items.length} comment{group.items.length === 1 ? '' : 's'}
                      </Badge>
                    </Group>
                    <Collapse in={expanded} mb={8}>
                      <Stack gap='xs' pl={26}>
                        {group.items.map((c) => (
                          <Group key={c._id} align='flex-start' wrap='nowrap'>
                            <Badge radius='md' color='gray' variant='light'>
                              L{c.startLine}-{c.endLine}
                            </Badge>
                            <Text size='sm' style={{ whiteSpace: 'pre-wrap' }}>
                              {c.comment}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Collapse>
                    <Divider />
                  </Stack>
                )
              })}
            </Stack>
          </ScrollArea>
        )}
        
        <Checkbox
          checked={ack}
          onChange={e => setAck(e.currentTarget.checked)}
          disabled={locked || totalComments === 0}
          label="I understand that after submitting, I will not be able to make further changes to this review."
          mb={8}
          fw={600}
          color='gray'
        />
        <Group justify='flex-end' gap='sm'>
          <Button
            leftSection={<IconSend size={16} />}
            disabled={!canSubmit}
            onClick={onConfirm}
            loading={submitting}
          >
            Confirm Submit
          </Button>
          <Button variant='default' onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default SubmitReviewConfirmationModal;
