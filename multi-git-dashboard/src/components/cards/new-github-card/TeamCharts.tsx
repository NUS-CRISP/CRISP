import { Carousel } from '@mantine/carousel';
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
import { TeamAnalyticsViewProps } from './TeamAnalyticsView';

const TeamCharts: React.FC<TeamAnalyticsViewProps> = ({
  teamData,
  cohortAverages,
}) => {
  const chartsData = [
    {
      title: 'Overall Activity',
      data: [
        {
          metric: 'Commits',
          team: teamData.commits,
          cohort: cohortAverages.commits,
        },
        {
          metric: 'Issues',
          team: teamData.issues,
          cohort: cohortAverages.issues,
        },
        {
          metric: 'Pull Requests',
          team: teamData.pullRequests,
          cohort: cohortAverages.pullRequests,
        },
      ],
    },
    {
      title: 'Contributions Breakdown',
      data: Object.entries(teamData.teamContributions).map(([key, value]) => ({
        name: key,
        value: value.commits + value.pullRequests,
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
                  <Tooltip />
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
