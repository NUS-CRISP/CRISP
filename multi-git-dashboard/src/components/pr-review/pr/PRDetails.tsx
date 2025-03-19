import { ProfileGetter } from '@/components/views/Overview';
import {
  Accordion,
  Box,
  Container,
  Divider,
  ScrollArea,
  Text,
  useMantineTheme,
} from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/pr-details.module.css';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { GitHandle } from '../../GitHandle';
import { Spacing } from './PR';

interface PRDetailsProps {
  pr: TeamData['teamPRs'][number] | undefined;
  spacing: Spacing;
  profileGetter: ProfileGetter;
}

const PRDetails: React.FC<PRDetailsProps> = ({
  pr,
  spacing,
  profileGetter,
}) => {
  if (!pr) return null;

  const { maxHeight, bottomSpace } = spacing;

  const theme = useMantineTheme();

  const [userColors, setUserColors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const newUserColors = new Map<string, string>();

    const getRandomColor = () =>
      theme.colors[
        Object.keys(theme.colors)[
          Math.floor(Math.random() * Object.keys(theme.colors).length)
        ]
      ][5];

    // Populate newUserColors with colors for each user in the PR details
    pr?.reviews.forEach(review => {
      if (!review.user) return;
      if (!newUserColors.has(review.user)) {
        newUserColors.set(review.user, getRandomColor());
      }
      review.comments.forEach(comment => {
        if (!newUserColors.has(comment.user)) {
          newUserColors.set(comment.user, getRandomColor());
        }
      });
    });

    setUserColors(newUserColors);
  }, [pr, theme]);

  return (
    <Box>
      <Box>
        <Text fw={500}>{pr.title}</Text>
        <Text size="sm">Status: {pr.state}</Text>
        <Text size="sm">
          Created At: {new Date(pr.createdAt).toLocaleDateString()}
        </Text>
      </Box>
      <Divider my="sm" />
      {pr.reviews.length === 0 ? (
        <Container>No reviews found.</Container>
      ) : (
        <ScrollArea.Autosize
          mih={300}
          mah={`calc(${maxHeight}px - ${bottomSpace}rem)`}
          scrollbars="y"
        >
          <Accordion variant="separated">
            {pr.reviews.map(review => (
              <Accordion.Item key={review.id} value={String(review.id)}>
                <Accordion.Control>
                  <GitHandle
                    gitHandle={review.user ?? ''}
                    profileGetter={profileGetter}
                  />
                  : {review.state}
                </Accordion.Control>
                <Accordion.Panel>
                  <Markdown>
                    {review.body === '' ? 'No review body' : review.body}
                  </Markdown>
                  {review.comments.length > 0 && (
                    <Accordion
                      chevron={<IconPlus className={classes.icon} />}
                      classNames={{ chevron: classes.chevron }}
                    >
                      {review.comments.map(comment => (
                        <Accordion.Item key={comment.id} value={comment.body}>
                          <Accordion.Control
                            icon={
                              <span
                                style={{
                                  display: 'inline-block',
                                  height: '10px',
                                  width: '10px',
                                  borderRadius: '50%',
                                  backgroundColor:
                                    userColors.get(comment.user) ||
                                    'defaultColor',
                                }}
                              />
                            }
                          >
                            {comment.user}
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Markdown>{comment.body}</Markdown>
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </ScrollArea.Autosize>
      )}
    </Box>
  );
};

export default PRDetails;
