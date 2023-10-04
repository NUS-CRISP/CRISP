import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";
import TeamData from "../models/TeamData";

const ORG_NAME = "NUS-CRISP";

const fetchAndSaveTeamData = async () => {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    installationId: process.env.GITHUB_APP_INSTALLATION_ID!,
  });

  const { token } = await auth({ type: "installation" });

  const octokit = new Octokit({ auth: token });

  // Fetch all repositories for an organization
  const repos = await octokit.rest.repos.listForOrg({
    org: ORG_NAME,
  });

  await TeamData.deleteMany({});  // temp w/a to avoid duplicates

  for (const repo of repos.data) {
    const contributors = await octokit.rest.repos.listContributors({
      owner: ORG_NAME,
      repo: repo.name,
    });

    const teamContributions = {};

    for (const contributor of contributors.data) {
      const commitsByContributor = await octokit.rest.repos.listCommits({
        owner: ORG_NAME,
        repo: repo.name,
        author: contributor.login,
      });
      if (contributor.login) {
        interface TeamContributions {
          [key: string]: number;
        }

        const teamContributions: TeamContributions = {};

        for (const contributor of contributors.data) {
          const commitsByContributor = await octokit.rest.repos.listCommits({
            owner: ORG_NAME,
            repo: repo.name,
            author: contributor.login,
          });
          if (contributor.login) {
            teamContributions[contributor.login] = commitsByContributor.data.length;
          }
        }

      }
    }

    // Fetch commits
    const commits = await octokit.rest.repos.listCommits({
      owner: ORG_NAME,
      repo: repo.name,
    });

    // Fetch issues
    const issues = await octokit.rest.issues.listForRepo({
      owner: ORG_NAME,
      repo: repo.name,
    });

    // Fetch pull requests
    const pullRequests = await octokit.rest.pulls.list({
      owner: ORG_NAME,
      repo: repo.name,
      state: 'open',
    });

    // Extract more information
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;

    // Process and save to MongoDB
    const teamData = new TeamData({
      teamId: repo.id,
      repoName: repo.name,
      commits: commits.data.length,
      issues: issues.data.length,
      stars,
      forks,
      pullRequests: pullRequests.data.length,
      updatedIssues: issues.data.map((issue) => issue.updated_at),
    });

    await teamData.save();
  }
};

export default fetchAndSaveTeamData