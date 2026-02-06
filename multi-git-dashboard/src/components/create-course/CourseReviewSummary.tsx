import { Card, Group, Text, Title } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { CourseType } from '@shared/types/Course';
import { CreateCourseFormValues } from './types';

interface Props {
  form: UseFormReturnType<CreateCourseFormValues>;
}

export const CourseReviewSummary = ({ form }: Props) => {
  return (
    <>
      <Title order={2} mt="md" mb="xs">
        Review &amp; Confirm
      </Title>
      <Text size="md" c="dimmed" mb="md">
        Review your course configuration before creating it.
      </Text>

      <Group align="flex-start" grow>
        <Card withBorder padding="md">
          <Title order={5} mb="xs">
            Course Details
          </Title>
          <Text size="md">
            <strong>Name: </strong>
            {form.values.name || '-'}
          </Text>
          <Text size="md">
            <strong>Code: </strong>
            {form.values.code || '-'}
          </Text>
          <Text size="md">
            <strong>Term: </strong>
            {form.values.semester || '-'}
          </Text>
          <Text size="md">
            <strong>Start Date: </strong>
            {form.values.startDate?.toLocaleDateString() || '-'}
          </Text>
          <Text size="md">
            <strong>Duration: </strong>
            {form.values.duration} weeks
          </Text>
        </Card>

        <Card withBorder padding="md">
          <Title order={5} mb="xs">
            Repositories
          </Title>
          <Text size="md">
            <strong>Source: </strong>
            {form.values.courseType === CourseType.GitHubOrg
              ? 'GitHub Organisation'
              : 'Manual Setup'}
          </Text>
          {form.values.courseType === CourseType.GitHubOrg && (
            <>
              <Text size="md">
                <strong>Organisation: </strong>
                {form.values.gitHubOrgName || '-'}
              </Text>
              <Text size="md">
                <strong>Repo filter: </strong>
                {form.values.repoNameFilter || '-'}
              </Text>
            </>
          )}
        </Card>
      </Group>

      <Card withBorder padding="md" mt="md">
        <Title order={5} mb="xs">
          AI Insights
        </Title>
        <Text size="md">
          <strong>Enabled: </strong>
          {form.values.isOn ? 'Yes' : 'No'}
        </Text>
        {form.values.isOn && (
          <>
            <Text size="md">
              <strong>Frequency: </strong>
              {form.values.frequency || '-'}
            </Text>
            <Text size="md">
              <strong>Start Date: </strong>
              {form.values.aiStartDate?.toLocaleDateString() || '-'}
            </Text>
            <Text size="md">
              <strong>Custom model: </strong>
              {form.values.customisedAI ? 'Yes' : 'No'}
            </Text>
            {form.values.customisedAI && (
              <>
                <Text size="md">
                  <strong>Provider: </strong>
                  {form.values.provider || '-'}
                </Text>
                <Text size="md">
                  <strong>Model: </strong>
                  {form.values.model || '-'}
                </Text>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
};
