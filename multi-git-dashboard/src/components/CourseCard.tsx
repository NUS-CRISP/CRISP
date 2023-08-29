import React from 'react';
import { Card, Text, Group } from '@mantine/core';

interface CourseCardProps {
  key: string;
  courseName: string;
  courseCode: string;
}

const CourseCard: React.FC<CourseCardProps> = ({ key, courseName, courseCode }) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group position="apart" mt="md" mb="xs">
        <Text weight={500}>{courseName}</Text>
      </Group>

      <Text size="sm" color="dimmed">
      {courseCode}
      </Text>
    </Card>
  );
};

export default CourseCard;