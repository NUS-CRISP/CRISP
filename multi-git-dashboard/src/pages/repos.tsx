import React from "react";
import useSWR from "swr";
import { Repo } from "./api/github";
import RepoCard from "../components/RepoCard";
import { Box, Group, LoadingOverlay } from "@mantine/core";

const ReposPage: React.FC = () => {
  const { data, error } = useSWR("/api/github", async (key) => {
    const res = await fetch(key);

    if (!res.ok) {
      throw new Error("Failed to fetch GitHub API");
    }

    const repoData: Repo[] = await res.json();
    return repoData;
  });

  if (error) return <div>failed to load github data</div>;
  if (!data)
    return (
      <>
        <Box maw={400}>
          <LoadingOverlay visible={true} overlayBlur={2} />
        </Box>
      </>
    );

  return (
    <main>
      <Group position="apart">
        {data.map((repo) => (
          <RepoCard repo={repo} key={repo.id} />
        ))}
      </Group>
    </main>
  );
};

export default ReposPage;
