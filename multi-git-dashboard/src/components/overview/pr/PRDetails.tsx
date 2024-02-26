import {
  Accordion,
  Box,
  Container,
  Divider,
  Text,
  useMantineTheme,
} from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/pr-details.module.css';
import { IconPlus } from '@tabler/icons-react';
import Markdown from 'react-markdown';

interface PRDetailsProps {
  pr: TeamData['teamPRs'][number] | undefined;
}

const PRDetails: React.FC<PRDetailsProps> = ({ pr }) => {
  if (!pr) return null;

  const theme = useMantineTheme();
  // Create map of users to random colors; this is used to color the user's name in the PR details
  const userColors = new Map<string, string>();
  const getRandomColor = () =>
    theme.colors[
      Object.keys(theme.colors)[
        Math.floor(Math.random() * Object.keys(theme.colors).length)
      ]
    ][5];

  return (
    <Box>
      <Text fw={500}>{pr.title}</Text>
      <Text size="sm">Status: {pr.state}</Text>
      <Text size="sm">
        Created At: {new Date(pr.createdAt).toLocaleDateString()}
      </Text>
      <Divider my="sm" />
      {pr.reviews.length === 0 ? (
        <Container>No reviews found.</Container>
      ) : (
        <Accordion variant="separated">
          {pr.reviews.map(review => (
            <Accordion.Item key={review.id} value={String(review.id)}>
              <Accordion.Control>
                {review.user}: {review.state}
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
                    {review.comments.map(comment => {
                      // If the user is not in the map, pick random color from theme.colors
                      if (!userColors.has(comment.user)) {
                        userColors.set(comment.user, getRandomColor());
                      }

                      return (
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
                      );
                    })}
                  </Accordion>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Box>
  );
};

export default PRDetails;
