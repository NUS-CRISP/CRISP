import { githubApp } from "../app/github";

export default async function GetGitHubStats() {
  const installations = await githubApp.octokit.request('GET /users/{username}/installation', {
    username: 'NUS-CRISP',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  const INSTALLATION_ID = installations.data.id;

  const octokit = await githubApp.getInstallationOctokit(INSTALLATION_ID);

  const res = await octokit.request('GET /repos/{owner}/{repo}/stats/code_frequency', {
    owner: 'NUS-CRISP',
    repo: 'CRISP',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center justify-center">
        <table className="table-auto shadow-lg bg-whitee">
          <thead>
            <tr>
              <th className="bg-blue-100 border text-left px-8 py-4">Week starting</th>
              <th className="bg-blue-100 border text-left px-8 py-4">Lines added</th>
              <th className="bg-blue-100 border text-left px-8 py-4">Lines deleted</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((week) => {
              return (
                <tr key={week[0]}>
                  <td className="border px-8 py-4">{new Date(week[0] * 1000).toDateString()}</td>
                  <td className="border px-8 py-4">{week[1]}</td>
                  <td className="border px-8 py-4">{week[2]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
