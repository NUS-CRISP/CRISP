import { Carousel } from '@mantine/carousel';
import { TeamData } from '@shared/types/TeamData';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const TeamCharts: React.FC<{ teamData: TeamData }> = ({ teamData }) => {
  // Aggregate data for team-level charts, e.g., total commits, issues, pull requests
  const chartsData = [
    {
      title: 'Overall Activity',
      data: [
        { metric: 'Commits', team: teamData.commits, cohort: 40 },
        { metric: 'Issues', team: teamData.issues, cohort: 10 },
        { metric: 'Pull Requests', team: teamData.pullRequests, cohort: 20 },
        // Add other metrics as needed
      ],
    },
    // Add more charts as needed
    // Example: Team Contributions by Category
    {
      title: 'Contributions Breakdown',
      data: Object.entries(teamData.teamContributions).map(([key, value]) => ({
        name: key,
        value: value.commits + value.pullRequests, // Simplified, adjust according to your data structure
      })),
    },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Carousel speed={10}>
      {chartsData.map((chart, idx) => (
        <Carousel.Slide>
          {idx === 0 ? (
            <>
              <h3>{chart.title}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  data={chart.data}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} />
                  <Radar
                    name="Team"
                    dataKey="team"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Cohort Average"
                    dataKey="cohort"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <h3>{chart.title}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    isAnimationActive={false}
                    data={chart.data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {chart.data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </Carousel.Slide>
      ))}
    </Carousel>
  );
};

export default TeamCharts;
