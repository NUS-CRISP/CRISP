import {
  convertPercentage,
  convertRating,
  getQualityGateLevel,
} from '@/lib/utils';
import React from 'react';
import { Grid, Card, Text, Title } from '@mantine/core';

interface CodeAnalysisOverviewProps {
  latestData: {
    metrics: string[];
    values: string[];
    types: string[];
    domains: string[];
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
}) => {
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

  const quality_gate_details_index = latestData.metrics.indexOf(
    'quality_gate_details'
  );
  const quality_gate_details =
    quality_gate_details_index === -1
      ? '-'
      : getQualityGateLevel(latestData.values[quality_gate_details_index]);

  return (
    <Grid gutter="lg">
      <Grid.Col span={4}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Security</Title>
          <Text size="xl" fw={700} c={getColorForRating(security_rating)}>
            {security_rating}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Reliability</Title>
          <Text size="xl" fw={700} c={getColorForRating(reliability_rating)}>
            {reliability_rating}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Maintainability</Title>
          <Text
            size="xl"
            fw={700}
            c={getColorForRating(maintainability_rating)}
          >
            {maintainability_rating}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Coverage</Title>
          <Text size="xl" fw={700} c={getColorForCoverage(coverage)}>
            {coverage}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Duplications</Title>
          <Text size="xl" fw={700} c={getColorForDuplication(duplication)}>
            {duplication}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={4}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Complexity</Title>
          <Text
            size="xl"
            fw={700}
            c={complexity === '-' ? '#666' : 'lightgray'}
          >
            {complexity}
          </Text>
        </Card>
      </Grid.Col>
      <Grid.Col span={12}>
        <Card padding="lg" shadow="sm" radius="md">
          <Title order={5}>Quality Gate</Title>
          <Text size="sm" fw={500}>
            Presence of critical issues
          </Text>
          <Text
            size="xl"
            fw={700}
            c={getColorForQualityGate(quality_gate_details)}
          >
            {quality_gate_details}
          </Text>
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default CodeAnalysisOverview;
