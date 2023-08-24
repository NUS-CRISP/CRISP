import React from 'react';

const RepoCard: React.FC<{weeks: number[][]}> = ({weeks}) => (
      <table className="table-auto shadow-lg bg-whitee">
        <thead>
          <tr>
            <th className="bg-blue-100 border text-left px-8 py-4">Week starting</th>
            <th className="bg-blue-100 border text-left px-8 py-4">Lines added</th>
            <th className="bg-blue-100 border text-left px-8 py-4">Lines deleted</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
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
    );

export default RepoCard;