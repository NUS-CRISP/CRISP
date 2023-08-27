import React from 'react';
import { Repo } from '../pages/api/github';
import { epochToDateString } from '../../common/utils';

const RepoCard: React.FC<{ repo: Repo }> = ({ repo }) => repo.data ? (
  <table className="table-auto shadow-lg bg-whitee">
    <thead>
      <tr>
        <th className="bg-blue-100 border text-left px-8 py-4">Week starting</th>
        <th className="bg-blue-100 border text-left px-8 py-4">Lines added</th>
        <th className="bg-blue-100 border text-left px-8 py-4">Lines deleted</th>
      </tr>
    </thead>
    <tbody>
      {repo.data.map(week => (
        <tr key={repo.id + String(week[0])}>
          <td className="border px-8 py-4">{epochToDateString(week[0])}</td>
          <td className="border px-8 py-4">{week[1]}</td>
          <td className="border px-8 py-4">{week[2]}</td>
        </tr>
      ))}
    </tbody>
  </table>
) : <div>No data for this repo: {repo.name}.</div>;

export default RepoCard;