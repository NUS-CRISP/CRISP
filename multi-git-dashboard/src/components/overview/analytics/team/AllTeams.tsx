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
    // Prepare data for the chart
    const data = teamDatas.map((teamData) => ({
        teamName: teamData.repoName, // assuming repoName is the name of the team
        commits: teamData.commits,
        issues: teamData.issues,
        pullRequests: teamData.pullRequests,
    }));

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
                {/* <Bar dataKey="commits" fill="#8884d8" name="Commits" />
                <Bar dataKey="issues" fill="#82ca9d" name="Issues" /> */}
                <Bar dataKey="pullRequests" fill="#ffc658" name="Pull Requests" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default AllTeams;
