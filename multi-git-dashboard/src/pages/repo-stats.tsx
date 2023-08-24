import RepoCard from '@/components/RepoCard';
import React from 'react';
import useSWR from 'swr';

const RepoStatsPage: React.FC = () => {
  const { data, error } = useSWR('/api/github', key => fetch(key).then(res => res.json()));

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center justify-center">
        <RepoCard weeks={data} />
      </div>
    </main>
  );
}

export default RepoStatsPage;