import { delay } from "@/lib/utils";
import { NextApiRequest, NextApiResponse } from "next";
import { App } from "octokit";

interface RepoRequestParams {
  id: number;
  name: string;
}

export interface Repo {
  id: number;
  name: string;
  data: number[][] | Record<string, never> | null;
}

const ORG_NAME = "NUS-CRISP";

const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
});

const res = await githubApp.octokit.request(
  "GET /users/{username}/installation",
  {
    username: ORG_NAME,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
);

const INSTALLATION_ID = res.data.id;

const octokit = await githubApp.getInstallationOctokit(INSTALLATION_ID);

async function getRepoStats(repo: RepoRequestParams) {
  const queryApi = () =>
    octokit.request("GET /repos/{owner}/{repo}/stats/code_frequency", {
      owner: ORG_NAME,
      repo: repo.name,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

  let response = await queryApi();

  while (response.status != 200) {
    // @ts-ignore - 204 is a possible response status
    if (response.status == 204) {
      return { ...repo, data: null };
    }
    await delay(1000);
    response = await queryApi();
  }

  return { ...repo, data: response.data ? response.data : null };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repo[]>,
) {
  const repos = (
    await octokit.request("GET /installation/repositories", {
      org: ORG_NAME,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
  ).data.repositories.map(({ id, name }) => ({ id, name }));

  const responses: Repo[] = await Promise.all(repos.map(getRepoStats));

  res.status(200).json(responses);
}
