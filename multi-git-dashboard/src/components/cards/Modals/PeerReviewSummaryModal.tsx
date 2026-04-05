import {
  Modal,
  Text,
  ScrollArea,
  Group,
  Button,
  Stack,
  Divider,
  Badge,
} from '@mantine/core';
import { useMemo } from 'react';

type PeerReviewCommentForSummary = {
  _id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  comment: string;
  isFlagged?: boolean;
  flagReason?: string;
};

type PeerReviewSummaryModalProps = {
  opened: boolean;
  onClose: () => void;
  repoName: string;
  comments: PeerReviewCommentForSummary[];
  onNavigate: (filePath: string, line: number) => void;
};

const PeerReviewSummaryModal: React.FC<PeerReviewSummaryModalProps> = ({
  opened,
  onClose,
  repoName,
  comments,
  onNavigate,
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, PeerReviewCommentForSummary[]>();
    for (const c of comments) {
      const arr = map.get(c.filePath) ?? [];
      arr.push(c);
      map.set(c.filePath, arr);
    }
    // sort comments by startLine
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.startLine - b.startLine);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [comments]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Review Summary — ${repoName}`}
      centered
      size="lg"
    >
      <Text size="sm" c="dimmed" mb="sm">
        Click an entry to jump to that file and line range.
      </Text>

      <ScrollArea h={520} scrollbarSize={6}>
        <Stack gap="md">
          {grouped.length === 0 ? (
            <Text>No comments found for this submission.</Text>
          ) : (
            grouped.map(([filePath, items]) => (
              <div key={filePath}>
                <Group justify="space-between" mb={6}>
                  <Text fw={600}>{filePath}</Text>
                  <Badge variant="light">{items.length} comment(s)</Badge>
                </Group>
                <Divider mb="sm" />
                <Stack gap="xs">
                  {items.map((c: PeerReviewCommentForSummary) => (
                    <Button
                      key={c._id}
                      variant="subtle"
                      fullWidth
                      onClick={() => onNavigate(filePath, c.startLine)}
                      styles={{
                        root: {
                          height: 'auto',
                          paddingTop: 8,
                          paddingBottom: 8,
                        },
                        inner: {
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start',
                        },
                        label: { width: '100%' },
                      }}
                    >
                      <Stack
                        gap={4}
                        style={{ width: '100%', alignItems: 'flex-start' }}
                      >
                        <Group gap="xs">
                          <Badge variant="outline">
                            L{c.startLine}-{c.endLine}
                          </Badge>
                          {c.isFlagged && <Badge color="red">Flagged</Badge>}
                        </Group>
                        <Text size="sm" lineClamp={1} style={{ maxWidth: 500 }}>
                          {c.comment}
                        </Text>
                        {c.isFlagged && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            Flag reason:{' '}
                            {c.flagReason?.trim() || 'No reason provided'}
                          </Text>
                        )}
                      </Stack>
                    </Button>
                  ))}
                </Stack>
              </div>
            ))
          )}
        </Stack>
      </ScrollArea>

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
};

export default PeerReviewSummaryModal;
