import React from 'react';
import useSWR from 'swr';
import RepoCard from '../components/RepoCard';
import { Box, Group, LoadingOverlay } from '@mantine/core';

interface Repo {
  id: number;
  name: string;
  data: [number, number, number][];
}

const ReposPage: React.FC = () => {
  const { data, error } = useSWR('/api/github', async key => {
    const res = await fetch(key);

    if (!res.ok) {
      throw new Error('Failed to fetch GitHub API');
    }

    const repoData = await res.json();
    return repoData;
  });

  if (error) return <div>failed to load github data</div>;
  if (!data)
    return (
      <>
        <Box maw={400}>
          <LoadingOverlay visible={true} />
        </Box>
      </>
    );

  return (
    <main>
      <Group>
        {data.map((repo: Repo) => (
          <RepoCard repo={repo} key={repo.id} />
        ))}
      </Group>
    </main>
  );
};

export default ReposPage;
