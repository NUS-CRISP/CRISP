import { Button, Radio, Select, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';

interface CreateGoogleFormProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
  teamSetNames: string[];
}

const CreateGoogleForm: React.FC<CreateGoogleFormProps> = ({
  courseId,
  onAssessmentCreated,
  teamSetNames,
}) => {
  const form = useForm({
    initialValues: {
      assessmentType: '',
      markType: '',
      frequency: '',
      granularity: 'individual',
      teamSetName: '',
      formLink: '',
      sheetID: '',
      sheetTab: '',
    },
  });

  const handleSubmit = async () => {
    console.log(form.values);
    const response = await fetch(`/api/courses/${courseId}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [form.values],
      }),
    });

    if (response.ok) {
      onAssessmentCreated();
    } else {
      console.error('Error creating assessment');
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        withAsterisk
        label="Assessment Type"
        {...form.getInputProps('assessmentType')}
      />
      <TextInput
        withAsterisk
        label="Mark Type"
        {...form.getInputProps('markType')}
      />
      <TextInput
        withAsterisk
        label="Frequency"
        {...form.getInputProps('frequency')}
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
            <Radio label="Individual" value="individual" />
            <Radio label="Team" value="team" />
          </div>
        </Radio.Group>
      </div>

      <Select
        withAsterisk
        label="Team Set"
        data={teamSetNames.map(name => ({ value: name, label: name }))}
        {...form.getInputProps('teamSetName')}
      />

      <TextInput
        withAsterisk
        label="Form Link"
        {...form.getInputProps('formLink')}
      />
      <TextInput label="Sheet ID" {...form.getInputProps('sheetID')} />
      <TextInput label="Sheet Tab" {...form.getInputProps('sheetTab')} />

      <Button style={{ marginTop: '8px' }} type="submit">
        Create Google Forms Assessment
      </Button>
    </form>
  );
};

export default CreateGoogleForm;
