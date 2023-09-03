import React from 'react';
import { Repo } from '../app/api/github/route';
import { CartesianGrid, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { createStyles, Text, Card, Group, rem } from '@mantine/core';
import { epochToDateString } from '../../common/utils';

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
  },

  label: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontWeight: 700,
    lineHeight: 1,
  },

  lead: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontWeight: 700,
    fontSize: rem(22),
    lineHeight: 1,
  },

  inner: {
    display: 'flex',

    [theme.fn.smallerThan('xs')]: {
      flexDirection: 'column',
    },
  },

  ring: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',

    [theme.fn.smallerThan('xs')]: {
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
  },
}));

const RepoCard: React.FC<{ repo: Repo }> = ({ repo }) => {
  const { classes, theme } = useStyles();
  const data = repo.data ? repo.data.map(row => ({ date: epochToDateString(row[0]), delta: row[1] - row[2] })) : [];

  // Dummy data
  const completed = Math.floor(Math.random() * 100);
  const items = [
    { value: Math.floor(Math.random() * 10), label: 'Commits' },
    { value: Math.floor(Math.random() * 10), label: 'Issues' },
  ].map(stat => (
    <div key={stat.label}>
      <Text className={classes.label}>{stat.value}</Text>
      <Text size="xs" color="dimmed">
        {stat.label}
      </Text>
    </div>
  ));

  return (
    <Card withBorder p="xl" radius="md" className={classes.card}>
      <div className={classes.inner}>
        <div>
          <Text fz="xl" className={classes.label}>
            {repo.name}
          </Text>
          <div>
            <Text className={classes.lead} mt={30}>
              {completed}
            </Text>
            <Text fz="xs" color="dimmed">
              Completed
            </Text>
          </div>
          <Group mt="lg">{items}</Group>
        </div>
        <div className={classes.ring} style={{color: "yellow"}}>
          <LineChart width={600} height={300} data={data}>
            <Line type="monotone" dataKey="delta" />
            <CartesianGrid stroke="#ffffff" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </div>
      </div>
    </Card>
  );
};

export default RepoCard;