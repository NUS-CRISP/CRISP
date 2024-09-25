import { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { AnalyticsProps } from '../Analytics';
import { TeamData } from '@shared/types/TeamData';

interface OverallActivityProps extends Omit<AnalyticsProps, 'team'> { }

const AllTeams: React.FC<OverallActivityProps> = ({ teamDatas }) => {
    const uniqueTeams = new Set<string>(); 
    const data = teamDatas
        .filter((teamData) => {
            if (uniqueTeams.has(teamData.repoName)) {
                return false;
            }
            uniqueTeams.add(teamData.repoName);
            return true;
        })
        .map((teamData) => ({
            teamName: teamData.repoName, // assuming repoName is the name of the team
            commits: teamData.commits,
            issues: teamData.issues,
            pullRequests: teamData.pullRequests,
        }))
        // Sort alphabetically by team name
        .sort((a, b) => a.teamName.localeCompare(b.teamName));

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={data}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="teamName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="commits" fill="#8884d8" name="Commits" />
                {/* Other bars can be re-added later */}
            </BarChart>
        </ResponsiveContainer>
    );
};

export default AllTeams;
