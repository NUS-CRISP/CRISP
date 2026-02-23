import PeerReviewBaseForm, {
  NormalizedPeerReviewBasePayload,
} from './PeerReviewBaseForm';
import { TeamSet } from '@shared/types/TeamSet';

interface CreatePeerReviewFormProps {
  courseId: string | string[] | undefined;
  teamSets: TeamSet[];
  onCreated: () => void;
  onClose?: () => void;
}

const CreatePeerReviewForm: React.FC<CreatePeerReviewFormProps> = ({
  courseId,
  teamSets,
  onCreated,
  onClose,
}) => {
  const submit = async (payload: NormalizedPeerReviewBasePayload) => {
    const res = await fetch(
      `/api/courses/${courseId}/internal-assessments/peer-review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? res.statusText);

    onCreated();
    onClose?.();
  };

  return (
    <PeerReviewBaseForm
      courseId={courseId}
      teamSets={teamSets}
      mode="create"
      submitLabel="Create Peer Review"
      onCancel={onClose}
      onSubmit={submit}
    />
  );
};

export default CreatePeerReviewForm;
