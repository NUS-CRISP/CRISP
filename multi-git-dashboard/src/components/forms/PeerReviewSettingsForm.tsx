import {
  Button,
  TextInput,
  Textarea,
  Text,
  Radio,
  Checkbox,
  Notification,
  Center,
  Loader,
} from '@mantine/core';
import { PeerReview, PeerReviewSettings } from '@shared/types/PeerReview';
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';

interface PeerReviewSettingsFormProps {
  courseId: string | string[] | undefined;
  peerReview: PeerReview | null;
  onSetUpConfirmed: () => void;
}

const PeerReviewSettingsForm: React.FC<PeerReviewSettingsFormProps> = ({
  courseId,
  peerReview,
  onSetUpConfirmed,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const createApiRoute = `/api/peer-review/${courseId}/peer-reviews`;
  const getSettingsApiRoute = `/api/peer-review/${courseId}/${peerReview?._id!}/settings`;
  const updateSettingsApiRoute = `/api/peer-review/${courseId}/${peerReview?._id!}/settings`;
  
  // Check if editing existing peer review or creating new [change to get status]
  const isEditing = Boolean(peerReview);
  const isOngoing = peerReview?.status === "Ongoing";
  
  // Create form with initial values and validation rules
  const form = useForm({
    initialValues: {
      assessmentName: '',
      description: '',
      startDate: '',
      endDate: '',
      reviewerType: 'Individual',
      TaAssignments: false,
      minReviews: 0,
      maxReviews: 1,
      manualAssign: true,
      randomAssign: false,
    },
    validate: {
      assessmentName: (value) => (value ? null : 'Assessment name is required'),
      description: (value) => (value ? null : 'Description is required'),
      startDate: (value) => {
        if (!value) {
          return 'Start date is required';
        }
        if (form.values.endDate && new Date(value) >= new Date(form.values.endDate)) {
          return 'Start date must be before end date';
        }
        // Add check to ensure start date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        if (new Date(value) < today) {
          return 'Start date cannot be in the past';
        }
        return null;
      },
      endDate: (value) => {
        if (!value) {
          return 'End date is required';
        }
        if (form.values.startDate && new Date(value) <= new Date(form.values.startDate)) {
          return 'End date must be after start date';
        }
        return null;
      },
      minReviews: (value) => {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num) || num < 0) {
          return 'Minimum reviews must be a non-negative integer';
        } else if (form.values.maxReviews && num > Number(form.values.maxReviews)) {
          return 'Minimum reviews cannot exceed maximum reviews';
        }
        return null;
      },
      maxReviews: (value) => {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num) || num < 1) {
          return 'Maximum reviews must be a positive integer';
        } else if (form.values.minReviews && num < Number(form.values.minReviews)) {
          return 'Maximum reviews cannot be less than minimum reviews';
        }
        return null;
      },
    }
  });
  
  useEffect(() => {
    if (!isEditing || !peerReview?._id) return;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(getSettingsApiRoute, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch peer review settings: ' + response.statusText);
        const data: PeerReviewSettings = await response.json();

        form.setValues({
          assessmentName: peerReview.title || '',
          description: peerReview.description || '',
          startDate: peerReview.startDate
            ? new Date(peerReview.startDate).toISOString().slice(0, 10)
            : '',
          endDate: peerReview.endDate
            ? new Date(peerReview.endDate).toISOString().slice(0, 10)
            : '',
          reviewerType: data.reviewerType,
          TaAssignments: data.TaAssignments,
          minReviews: data.minReviewsPerReviewer ?? 0,
          maxReviews: data.maxReviewsPerReviewer ?? 1,
          manualAssign: (data.assignmentMode === "Manual" || data.assignmentMode === "Hybrid"),
          randomAssign: (data.assignmentMode === "Random" || data.assignmentMode === "Hybrid"),
        });
      } catch (err) {
        console.error('Error fetching peer review settings:', err);
        setError('Failed to load existing peer review settings: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isEditing, peerReview, courseId]);
  
  const handleSubmit = async () => {
    setError(null);
    try {
      console.log("Submitting to:", isEditing ? updateSettingsApiRoute : createApiRoute);
      const response = await fetch(isEditing ? updateSettingsApiRoute : createApiRoute, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.values),
      });

      await response.json();
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      if (!isEditing) form.reset()
      onSetUpConfirmed();
    } catch (error) {
      console.error('Error submitting peer review settings:', error);
      setError('Failed to submit peer review settings: ' + (error as Error).message);
    }
  };
  
  if (loading) {
    return (
      <Center mt="md">
        <Loader size="sm" />
      </Center>
    );
  }
  
  return (
    <>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
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
          withAsterisk={!isOngoing}
          disabled={isOngoing}
          label="Start Date"
          {...form.getInputProps('startDate')}
          placeholder="YYYY-MM-DD"
          type="date"
        />

        <TextInput
          withAsterisk={!isOngoing}
          disabled={isOngoing}
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
            disabled={isOngoing}
            label="Manual"
            checked={form.values.manualAssign}
            onChange={event =>
              form.setFieldValue('manualAssign', event.currentTarget.checked)
            }
            styles={{ input: { cursor: "pointer" } }}
          />
          <Checkbox
            disabled={isOngoing}
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
              <Radio
                label="Team"
                value="Team"
                styles={{ radio: { cursor: "pointer" } }}
                disabled={isOngoing}
              />
              <Radio
                label="Individual"
                value="Individual"
                styles={{ radio: { cursor: "pointer" } }}
                disabled={isOngoing}
              />
            </div>
          </Radio.Group>
        </div>
        
        <Text style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>
          Assign Peer Reviews to Teaching Assistants?
        </Text>
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: "row", gap: '15px' }}>
          <Radio.Group
            value={form.values.TaAssignments ? "yes" : "no"}
            onChange={(val) => form.setFieldValue("TaAssignments", val === "yes")}
          >
            <div style={{ display: 'flex', gap: '32px' }}>
              <Radio label="Yes" value="yes" disabled={isOngoing} styles={{ radio: { cursor: "pointer" } }} />
              <Radio label="No" value="no" disabled={isOngoing} styles={{ radio: { cursor: "pointer" } }} />
            </div>
          </Radio.Group>
        </div>
        

        <TextInput
          withAsterisk={!isOngoing}
          disabled={isOngoing}
          label="Minimum Reviews per Reviewer"
          {...form.getInputProps('minReviews')}
          placeholder="Enter min reviews"
          type="number"
        />
        
        <TextInput
          withAsterisk={!isOngoing}
          disabled={isOngoing}
          label="Maximum Reviews per Reviewer"
          {...form.getInputProps('maxReviews')}
          placeholder="Enter max reviews"
          type="number"
        />

        <Button type="submit" mt="sm">
          {isEditing ? "Update Settings" : "Create Peer Review"}
        </Button>
      </form>
    </>
  );
};

export default PeerReviewSettingsForm;
