import {
  convertPercentage,
  convertRating,
  metricExplanations,
} from '@/lib/utils';
import React, { useState } from 'react';
import { Grid, Card, Text, Title, Container, Center } from '@mantine/core';
import { IconHelpCircle } from '@tabler/icons-react';

interface CodeAnalysisOverviewProps {
  latestData: {
    metrics: string[];
    values: string[];
    types: string[];
    domains: string[];
    metricStats: Map<string, { median: number; mean: number }>;
  };
  executedDate: Date;
}

const getColorForRating = (rating: string) => {
  switch (rating) {
    case 'A':
      return '#5BB751';
    case 'B':
      return '#92CA87';
    case 'C':
      return '#FFCD3A';
    case 'D':
      return '#F78F37';
    case 'E':
      return '#F05A5E';
    case 'F':
      return '#D72229';
    default:
      return '#666';
  }
};

const getColorForDuplication = (duplication: string) => {
  if (duplication === '-') return '#666';
  const percentage = parseFloat(duplication);
  if (percentage < 10) return '#5BB751';
  if (percentage < 20) return '#92CA87';
  if (percentage < 40) return '#FFCD3A';
  if (percentage < 60) return '#F78F37';
  if (percentage < 80) return '#F05A5E';
  return '#D72229';
};

const getColorForCoverage = (coverage: string) => {
  if (coverage === '-') return '#666';
  const percentage = parseFloat(coverage);
  if (percentage > 80) return '#5BB751';
  if (percentage > 60) return '#92CA87';
  if (percentage > 40) return '#FFCD3A';
  if (percentage > 20) return '#F78F37';
  if (percentage > 10) return '#F05A5E';
  return '#D72229';
};

const getColorForQualityGate = (qualityGate: string) => {
  switch (qualityGate) {
    case 'OK':
      return '#5BB751';
    case 'WARN':
      return '#FFCD3A';
    case 'ERROR':
      return '#D72229';
    default:
      return '#666';
  }
};

const CodeAnalysisOverview: React.FC<CodeAnalysisOverviewProps> = ({
  latestData,
  executedDate,
}) => {
  const metricStatsMap = new Map(Object.entries(latestData.metricStats));

  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [hoveredMetricValue, setHoveredMetricValue] = useState<string | null>(
    null
  );

  const security_rating_index = latestData.metrics.indexOf('security_rating');
  const security_rating =
    security_rating_index === -1
      ? '-'
      : convertRating(latestData.values[security_rating_index]);

  const reliability_rating_index =
    latestData.metrics.indexOf('reliability_rating');
  const reliability_rating =
    reliability_rating_index === -1
      ? '-'
      : convertRating(latestData.values[reliability_rating_index]);

  const maintainability_rating_index =
    latestData.metrics.indexOf('sqale_rating');
  const maintainability_rating =
    maintainability_rating_index === -1
      ? '-'
      : convertRating(latestData.values[maintainability_rating_index]);

  const coverage_index = latestData.metrics.indexOf('coverage');
  const coverage =
    coverage_index === -1
      ? '-'
      : convertPercentage(latestData.values[coverage_index]);

  const duplication_index = latestData.metrics.indexOf(
    'duplicated_lines_density'
  );
  const duplication =
    duplication_index === -1
      ? '-'
      : convertPercentage(latestData.values[duplication_index]);

  const complexity_index = latestData.metrics.indexOf('complexity');
  const complexity =
    complexity_index === -1 ? '-' : latestData.values[complexity_index];

  const bugs_per_commit_index = latestData.metrics.indexOf('bugs_per_commit');
  const bugs_per_commit =
    bugs_per_commit_index === -1
      ? '-'
      : latestData.values[bugs_per_commit_index];

  const code_smells_per_commit_index = latestData.metrics.indexOf(
    'code_smells_per_commit'
  );
  const code_smells_per_commit =
    code_smells_per_commit_index === -1
      ? '-'
      : latestData.values[code_smells_per_commit_index];

  const lines_per_commit_index = latestData.metrics.indexOf('lines_per_commit');
  const lines_per_commit =
    lines_per_commit_index === -1
      ? '-'
      : latestData.values[lines_per_commit_index];

  const lines_per_story_point_index = latestData.metrics.indexOf(
    'lines_per_story_point'
  );
  const lines_per_story_point =
    lines_per_story_point_index === -1
      ? '-'
      : latestData.values[lines_per_story_point_index];

  const quality_gate_status_index = latestData.metrics.indexOf('alert_status');
  const quality_gate_status =
    quality_gate_status_index === -1
      ? '-'
      : latestData.values[quality_gate_status_index];

  const handleMouseEnterMetric = (metric: string) => {
    setHoveredMetric(metric);
  };

  const handleMouseLeaveMetric = () => {
    setHoveredMetric(null);
  };

  const handleMouseEnterMetricValue = (metric: string) => {
    setHoveredMetricValue(metric);
  };

  const handleMouseLeaveMetricValue = () => {
    setHoveredMetricValue(null);
  };

  const metricCard = (
    title: string,
    value: string,
    metricKey: string,
    colorFn?: (s: string) => string
  ) => {
    const color =
      value === '-' ? '#666' : colorFn ? colorFn(value) : 'lightgray';
    return (
      <Card padding="lg" shadow="sm" radius="md" style={{ height: '100%' }}>
        <Title order={5}>
          {title}
          <IconHelpCircle
            size={16}
            onMouseEnter={() => handleMouseEnterMetric(metricKey)}
            onMouseLeave={handleMouseLeaveMetric}
            style={{ cursor: 'pointer', color: 'gray', marginLeft: '4px' }}
          />
        </Title>
        <Text
          size="xl"
          fw={700}
          c={color}
          onMouseEnter={() => handleMouseEnterMetricValue(metricKey)}
          onMouseLeave={handleMouseLeaveMetricValue}
        >
          {value}
        </Text>
      </Card>
    );
  };

  return (
    <Container>
      <Grid gutter="lg">
        <Grid.Col span={4}>
          {metricCard(
            'Security',
            security_rating,
            'security_rating',
            getColorForRating
          )}
        </Grid.Col>
        <Grid.Col span={4}>
          {metricCard(
            'Reliability',
            reliability_rating,
            'reliability_rating',
            getColorForRating
          )}
        </Grid.Col>
        <Grid.Col span={4}>
          {metricCard(
            'Maintainability',
            maintainability_rating,
            'sqale_rating',
            getColorForRating
          )}
        </Grid.Col>
        <Grid.Col span={4}>
          {metricCard('Coverage', coverage, 'coverage', getColorForCoverage)}
        </Grid.Col>
        <Grid.Col span={4}>
          {metricCard(
            'Duplication',
            duplication,
            'duplicated_lines_density',
            getColorForDuplication
          )}
        </Grid.Col>
        <Grid.Col span={4}>
          {metricCard('Complexity', complexity, 'complexity')}
        </Grid.Col>
        <Grid.Col span={3}>
          {metricCard('Bugs / Commit', bugs_per_commit, 'bugs_per_commit')}
        </Grid.Col>
        <Grid.Col span={3}>
          {metricCard(
            'Code Smells / Commit',
            code_smells_per_commit,
            'code_smells_per_commit'
          )}
        </Grid.Col>
        <Grid.Col span={3}>
          {metricCard('Lines / Commit', lines_per_commit, 'lines_per_commit')}
        </Grid.Col>
        <Grid.Col span={3}>
          {metricCard(
            'Lines / Story Point',
            lines_per_story_point,
            'lines_per_story_point'
          )}
        </Grid.Col>
        <Grid.Col span={12}>
          <Card padding="lg" shadow="sm" radius="md">
            <Title order={5}>
              Quality Gate
              <IconHelpCircle
                size={16}
                onMouseEnter={() => handleMouseEnterMetric('alert_status')}
                onMouseLeave={handleMouseLeaveMetric}
                style={{ cursor: 'pointer', marginLeft: '4px', color: 'gray' }}
              />
            </Title>
            <Text
              size="xl"
              fw={700}
              c={getColorForQualityGate(quality_gate_status)}
              onMouseEnter={() => handleMouseEnterMetricValue('alert_status')}
              onMouseLeave={handleMouseLeaveMetricValue}
            >
              {quality_gate_status}
            </Text>
            <Text c={getColorForQualityGate(quality_gate_status)}>
              {quality_gate_status === 'OK'
                ? 'Code is free from critical errors.'
                : quality_gate_status === 'WARN'
                  ? 'Code has some issues that need to be addressed.'
                  : 'Code has critical errors that need to be fixed.'}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>
      <Center mt={5} style={{ fontSize: '12px' }}>
        As of {executedDate.toLocaleString()}
      </Center>

      {hoveredMetric && metricExplanations[hoveredMetric] && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '5px',
          }}
        >
          <strong>{hoveredMetric}</strong>: {metricExplanations[hoveredMetric]}
        </div>
      )}

      {hoveredMetricValue && metricStatsMap.has(hoveredMetricValue) && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '40%',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '5px',
          }}
        >
          <strong>Median</strong>:{' '}
          {metricStatsMap.get(hoveredMetricValue).median}
          <br />
          <strong>Mean</strong>: {metricStatsMap.get(hoveredMetricValue).mean}
        </div>
      )}
    </Container>
  );
};

export default CodeAnalysisOverview;
