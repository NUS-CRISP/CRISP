import { Box, Notification } from '@mantine/core';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';
import CourseRoles, { CourseRole } from '@shared/types/auth/CourseRole';

interface UpdateUserCSVFormProps {
  courseId: string | string[] | undefined;
  onUpdate: () => void;
  role: CourseRole;
}

const UpdateUserCSVForm: React.FC<UpdateUserCSVFormProps> = ({
  courseId,
  onUpdate,
  role,
}) => {
  let apiRoute = `/api/courses/${courseId}/`;

  if (role === CourseRoles.Faculty) {
    apiRoute += 'faculty';
  } else if (role === CourseRoles.TA) {
    apiRoute += 'tas';
  } else {
    apiRoute += 'students';
  }
  const csvTemplateHeaders = ['identifier', 'name', 'gitHandle'];

  const [error, setError] = useState<string | null>(null);

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onUpdate}
        onError={setError}
        filename="update_template.csv"
        uploadButtonString="Upload new data"
        urlString={apiRoute}
        requestType="PATCH"
      />
    </Box>
  );
};

export default UpdateUserCSVForm;
