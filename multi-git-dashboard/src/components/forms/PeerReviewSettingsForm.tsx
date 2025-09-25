import {
  Button,
  TextInput,
  Textarea,
  Text,
  Radio,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';

interface PeerReviewSettingsFormProps {
  courseId: string | string[] | undefined;
  peerReviewId: string | null;
  onSetUpConfirmed: () => void;
}

const PeerReviewSettingsForm: React.FC<PeerReviewSettingsFormProps> = ({
  courseId,
  peerReviewId,
  onSetUpConfirmed,
}) => {
  
  const form = useForm({
      initialValues: {
        assessmentName: '',
        description: '',
        startDate: '',
        endDate: '',
        reviewerType: 'individual',
        TaAssignments: false,
        minReviews: '0',
        maxReviews: '1',
        manualAssign: true,
        randomAssign: false,
      },
    });
    
    // TO DO: Add validation to ensure minReviews is not greater than maxReviews
    const handleSubmit = async () => {
      try {
        const response = await fetch(
          `/api/courses/${courseId}/peer-review-set-up`,
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
          onSetUpConfirmed();
        } else {
          alert('Error creating internal assessment');
        }
      } catch (error) {
        alert('Something went wrong when creating internal assessment');
      }
    };
  
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        withAsterisk
        label="Peer Review Title"
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
        type="date"
      />

      <TextInput
        withAsterisk
        label="End Date"
        {...form.getInputProps('endDate')}
        placeholder="YYYY-MM-DD"
        type="date"
      />

      <Text
        style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}
      >
        Mode of Assiging Peer Reviews
      </Text>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: "row", gap: '15px' }}>
        <Checkbox
          label="Manual"
          checked={form.values.manualAssign}
          onChange={event =>
            form.setFieldValue('manualAssign', event.currentTarget.checked)
          }
          styles={{ input: { cursor: "pointer" } }}
        />
        <Checkbox
          label="Random"
          checked={form.values.randomAssign}
          onChange={event =>
            form.setFieldValue('randomAssign', event.currentTarget.checked)
          }
          styles={{ input: { cursor: "pointer" } }}
        />
      </div>
      
      <Text
        style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}
      >
        Reviewer Type
      </Text>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: "row", gap: '15px' }}>
        <Radio.Group
          value={form.values.reviewerType}
          onChange={value => form.setFieldValue('reviewerType', value)}
        >
          <div style={{ display: 'flex', gap: '20px' }}>
            <Radio label="Team" value="team" styles={{ radio: { cursor: "pointer" } }} />
            <Radio label="Individual" value="individual" styles={{ radio: { cursor: "pointer" } }} />
          </div>
        </Radio.Group>
      </div>
      
      <Text
        style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}
      >
        Assign Peer Reviews to Teaching Assistants?
      </Text>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: "row", gap: '15px' }}>
        <Radio.Group
          value={form.values.TaAssignments ? "yes" : "no"}
          onChange={(val) => form.setFieldValue("TaAssignments", val === "yes")}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <Radio label="Yes" value="yes" styles={{ radio: { cursor: "pointer" } }} />
            <Radio label="No" value="no" styles={{ radio: { cursor: "pointer" } }} />
          </div>
        </Radio.Group>
      </div>
      

      <TextInput
        label="Minimum Reviews per Reviewer"
        {...form.getInputProps('minReviews')}
        placeholder="Enter min reviews"
        type="number"
      />
      
      <TextInput
        label="Maximum Reviews per Reviewer"
        {...form.getInputProps('maxReviews')}
        placeholder="Enter max reviews"
        type="number"
      />

      <Button type="submit" mt="sm">
        {peerReviewId ? "Update Settings" : "Create Peer Review"}
      </Button>
    </form>
  );
};

export default PeerReviewSettingsForm;
