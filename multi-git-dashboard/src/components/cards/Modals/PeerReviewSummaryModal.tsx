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

type Props = {
  opened: boolean;
  onClose: () => void;
  repoName: string;
  comments: Array<{
    _id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    comment: string;
  }>;
  onNavigate: (filePath: string, line: number) => void;
};

const PeerReviewSummaryModal: React.FC<Props> = ({
  opened,
  onClose,
  repoName,
  comments,
  onNavigate,
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
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
                  {items.map((c: any) => (
                    <Button
                      key={c._id}
                      variant="subtle"
                      justify="space-between"
                      onClick={() => onNavigate(filePath, c.startLine)}
                      styles={{
                        inner: { justifyContent: 'space-between' },
                      }}
                    >
                      <Group gap="xs">
                        <Badge variant="outline">
                          L{c.startLine}-{c.endLine}
                        </Badge>
                        <Text size="sm" lineClamp={1}>
                          {c.comment}
                        </Text>
                      </Group>
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
