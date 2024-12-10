// CreateInternalForm.tsx

import {
  Button,
  Select,
  TextInput,
  Textarea,
  Text,
  Radio,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';

interface CreateInternalFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSetNames: string[];
}

const CreateInternalForm: React.FC<CreateInternalFormProps> = ({
  courseId,
  onAssessmentCreated,
  teamSetNames,
}) => {
  const form = useForm({
    initialValues: {
      assessmentName: '',
      description: '',
      startDate: '',
      endDate: '',
      granularity: 'team',
      maxMarks: '0',
      teamSetName: '',
      areSubmissionsEditable: false, // New field added
    },
  });

  const handleSubmit = async () => {
    try {
      const response = await fetch(
        `/api/courses/${courseId}/internal-assessments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [form.values],
          }),
        }
      );

      if (response.ok) {
        onAssessmentCreated();
      } else {
        console.error('Error creating internal assessment');
      }
    } catch (error) {
      console.error('Error creating internal assessment', error);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        withAsterisk
        label="Assessment Name"
        {...form.getInputProps('assessmentName')}
      />
      <Textarea
        withAsterisk
        label="Description"
        {...form.getInputProps('description')}
      />
      <TextInput
        withAsterisk
        label="Start Date"
        {...form.getInputProps('startDate')}
        placeholder="YYYY-MM-DD"
        type="date" // Change input type to date
      />
      <TextInput
        label="End Date (Optional)"
        {...form.getInputProps('endDate')}
        placeholder="YYYY-MM-DD"
        type="date" // Change input type to date
      />

      {/* Bold title and padding for granularity section */}
      <Text
        style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}
      >
        Assessment Type
      </Text>
      <div style={{ marginBottom: '16px' }}>
        <Radio.Group
          value={form.values.granularity}
          onChange={value => form.setFieldValue('granularity', value)}
        >
          <div style={{ display: 'flex', gap: '20px' }}>
            <Radio label="Team" value="team" />
            <Radio label="Individual" value="individual" />
          </div>
        </Radio.Group>
      </div>

      <TextInput
        withAsterisk
        label="Maximum Marks (0 if ungraded)"
        {...form.getInputProps('maxMarks')}
        placeholder="Enter max marks"
        type="number"
      />

      <Select
        withAsterisk
        label="Which Team Assignment?"
        data={teamSetNames.map(name => ({ value: name, label: name }))}
        {...form.getInputProps('teamSetName')}
      />

      {/* New Checkbox for areSubmissionsEditable */}
      <Checkbox
        label="Allow Submissions to be Editable"
        checked={form.values.areSubmissionsEditable}
        onChange={event =>
          form.setFieldValue(
            'areSubmissionsEditable',
            event.currentTarget.checked
          )
        }
        style={{ marginTop: '16px' }}
      />

      <Button type="submit" mt="sm">
        Create Internal Assessment
      </Button>
    </form>
  );
};

export default CreateInternalForm;
