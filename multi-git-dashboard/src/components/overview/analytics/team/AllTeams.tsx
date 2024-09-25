import { useState, forwardRef } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
    ComposedChart,
    Area,
} from 'recharts';
import { Carousel, Embla } from '@mantine/carousel';
import { Card, Stack, Title, Center } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';

interface AllTeamsProps {
    teamDatas: TeamData[];
}

const AllTeams = forwardRef<HTMLDivElement, AllTeamsProps>(({ teamDatas }, ref) => {
    const [embla, setEmbla] = useState<Embla | null>(null);

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
            teamName: teamData.repoName,
            commits: teamData.commits,
            issues: teamData.issues,
            pullRequests: teamData.pullRequests,
            weeklyCommits: teamData.weeklyCommits.length,
        }))
        .sort((a, b) => a.teamName.localeCompare(b.teamName));

    const CourseOverviewChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="teamName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area dataKey="commits" name="Commits" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                <Area dataKey="issues" name="Issues" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPv)" />
                <Line dataKey="pullRequests" name="Pull Requests" stroke="#ff7300" opacity="50" />
                <Line dataKey="weeklyCommits" name="Weekly Commits" stroke="var(--mantine-color-blue-filled)" opacity="50" />
            </ComposedChart>
        </ResponsiveContainer>
    );

    const PRBarChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="teamName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pullRequests" fill="#82ca9d" name="Pull Requests" />
            </BarChart>
        </ResponsiveContainer>
    );

    const slides = [
        {
            title: 'Course Overview',
            component: CourseOverviewChart,
        },
        {
            title: 'Pull Requests',
            component: PRBarChart,
        },
    ];

    return (
        <Card withBorder ref={ref} style={{ marginBottom: "16px" }}>
            <Carousel
                getEmblaApi={setEmbla}
                nextControlProps={{
                    onClick: () => embla?.reInit(),
                }}
                previousControlProps={{
                    onClick: () => embla?.reInit(),
                }}
            >
                {slides.map(({ title, component: ChartComponent }, idx) => (
                    <Carousel.Slide key={idx}>
                        <Stack>
                            <Center>
                                <Title order={3}>{title}</Title>
                            </Center>
                            <ChartComponent />
                        </Stack>
                    </Carousel.Slide>
                ))}
            </Carousel>
        </Card>
    );
});

export default AllTeams;
