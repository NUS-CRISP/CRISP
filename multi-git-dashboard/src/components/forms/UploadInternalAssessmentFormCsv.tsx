import { useState } from 'react';
import { Notification } from '@mantine/core';
import CSVUpload from '../csv/CSVUpload';

interface UploadInternalCSVProps {
  courseId: string | string[] | undefined;
  onAssessmentCreated: () => void;
}

const UploadInternalCSV: React.FC<UploadInternalCSVProps> = ({
  courseId,
  onAssessmentCreated,
}) => {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <CSVUpload
        headers={['assessmentType', 'markType', 'frequency', 'granularity', 'teamSetName', 'maxMarks', 'startDate', 'endDate', 'gradedBy']}
        onProcessComplete={onAssessmentCreated}
        onError={setError}
        filename="internal_assessment_template.csv"
        uploadButtonString="Upload Internal Assessments"
        urlString={`/api/courses/${courseId}/assessments`}
      />
    </>
  );
};

export default UploadInternalCSV;
