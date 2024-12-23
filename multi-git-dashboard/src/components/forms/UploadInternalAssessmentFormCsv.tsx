import { useState } from 'react';
import { Notification, Text, Accordion } from '@mantine/core';
import CSVUpload from '../csv/CSVUpload';

const internalAssessmentHeaders = [
  'assessmentName',
  'description',
  'startDate', // "YYYY-MM-DD"
  'endDate',   // "YYYY-MM-DD"
  'maxMarks',
  'granularity',    // "team" or "individual"
  'teamSetName',    // Must match an existing TeamSet in the course
  'areSubmissionsEditable', // "true" or "false"
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInternalAssessments(data: any[]): any[] {
  return data.map((row, idx) => {
    const rowIndex = idx + 1;

    if (!row.assessmentName) {
      throw new Error(`Row ${rowIndex} is missing "assessmentName"`);
    }
    if (!row.description) {
      throw new Error(`Row ${rowIndex} is missing "description"`);
    }
    if (!row.startDate) {
      throw new Error(`Row ${rowIndex} is missing "startDate" (format: YYYY-MM-DD)`);
    }
    if (!row.granularity) {
      throw new Error(`Row ${rowIndex} is missing "granularity"`);
    }
    if (!row.teamSetName) {
      throw new Error(`Row ${rowIndex} is missing "teamSetName"`);
    }

    const parsedMaxMarks = row.maxMarks ? Number(row.maxMarks) : 0;
    const parsedEditable = row.areSubmissionsEditable === 'true';

    return {
      assessmentName: row.assessmentName,
      description: row.description,
      startDate: row.startDate,
      endDate: row.endDate || null,
      maxMarks: isNaN(parsedMaxMarks) ? 0 : parsedMaxMarks,
      granularity: row.granularity,
      teamSetName: row.teamSetName,
      areSubmissionsEditable: parsedEditable,
    };
  });
}

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
        <Notification
          title="Error"
          color="red"
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Notification>
      )}

      <Accordion mt="md" variant="separated" defaultValue={null}>
        <Accordion.Item value="formatting">
          <Accordion.Control>CSV Formatting Instructions</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" mb="xs">
              Ensure all cells with data use "Text" number formatting, not General, Date or any other format.
            </Text>
            <Text size="sm" mb="xs">
              Each row in the CSV represents a single internal assessment.
            </Text>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>
                <strong>assessmentName</strong>: string (required)
              </li>
              <li>
                <strong>description</strong>: string (required)
              </li>
              <li>
                <strong>startDate</strong>: format <code>YYYY-MM-DD</code> (required)
              </li>
              <li>
                <strong>endDate</strong>: format <code>YYYY-MM-DD</code> (optional)
              </li>
              <li>
                <strong>maxMarks</strong>: number (defaults to 0 if empty)
              </li>
              <li>
                <strong>granularity</strong>: <code>"team"</code> or <code>"individual"</code> (required)
              </li>
              <li>
                <strong>teamSetName</strong>: must match an existing TeamSet in this course (required)
              </li>
              <li>
                <strong>areSubmissionsEditable</strong>: <code>"true"</code> or <code>"false"</code>
              </li>
            </ul>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Drop zone and upload button */}
      <CSVUpload
        headers={internalAssessmentHeaders}
        onProcessComplete={onAssessmentCreated}
        onError={setError}
        filename="internal_assessment_template.csv"
        uploadButtonString="Upload Internal Assessments"
        urlString={`/api/courses/${courseId}/internal-assessments`}
        requestType="POST"
        transformFunction={transformInternalAssessments}
      />
    </>
  );
};

export default UploadInternalCSV;
