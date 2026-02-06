import { Group, Text, TextInput, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { UseFormReturnType } from '@mantine/form';
import { CreateCourseFormValues } from '@/components/create-course/types';

interface Props {
  form: UseFormReturnType<CreateCourseFormValues>;
}

export const CourseDetailsSetup = ({ form }: Props) => {
  return (
    <>
      <TextInput
        withAsterisk
        label="Course Name"
        size="lg"
        placeholder="Software Engineering Project"
        {...form.getInputProps('name')}
        value={form.values.name}
        onChange={e => form.setFieldValue('name', e.currentTarget.value)}
      />

      <TextInput
        withAsterisk
        mt="md"
        label="Course Code"
        size="lg"
        placeholder="CS3203"
        {...form.getInputProps('code')}
        value={form.values.code}
        onChange={e => form.setFieldValue('code', e.currentTarget.value)}
      />
      <TextInput
        withAsterisk
        mt="md"
        label="Academic Term"
        size="lg"
        placeholder="AY2025/2026 Semester 1"
        {...form.getInputProps('semester')}
        value={form.values.semester}
        onChange={e => form.setFieldValue('semester', e.currentTarget.value)}
      />

      <Group mt="md" grow gap="md" align="flex-start">
        <DatePickerInput
          withAsterisk
          label="Start Date"
          size="lg"
          placeholder="Pick start date"
          error={form.errors.startDate}
          value={form.values.startDate}
          onChange={value => form.setFieldValue('startDate', value)}
        />
        <TextInput
          withAsterisk
          label="Duration"
          size="lg"
          placeholder="13"
          rightSection={<Text size="lg" style={{ paddingRight: 30 }}> weeks </Text>}
          {...form.getInputProps('duration')}
          value={form.values.duration}
          onChange={e =>
            form.setFieldValue('duration', Number(e.currentTarget.value) || 0)
          }
        />
      </Group>
    </>
  );
};
