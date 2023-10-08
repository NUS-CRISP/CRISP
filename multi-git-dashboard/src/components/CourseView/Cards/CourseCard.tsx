import React from 'react';
import { Card, Text, Group } from '@mantine/core';

interface CourseCardProps {
  name: string;
  code: string;
  semester: string;
}

const CourseCard: React.FC<CourseCardProps> = ({ name, code, semester }) => {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ width: '350px', height: '200px' }}
    >
      <Group position="apart" mt="md" mb="xs">
        <Text weight={500}>{name}</Text>
      </Group>

      <Text size="sm" color="dimmed">
        {code}
      </Text>
      <Text size="sm" color="dimmed">
        {semester}
      </Text>
    </Card>
  );
};

export default CourseCard;
