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
      style={{
        width: '350px',
        height: '200px',
        marginTop: '6px',
        marginBottom: '6px',
      }}
    >
      <Group mt="md" mb="xs">
        <Text>{name}</Text>
      </Group>

      <Text size="sm" c="dimmed">
        {code}
      </Text>
      <Text size="sm" c="dimmed">
        {semester}
      </Text>
    </Card>
  );
};

export default CourseCard;
