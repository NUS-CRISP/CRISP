/* eslint-disable @typescript-eslint/no-unused-vars */
// import {
//   Alert,
//   Anchor,
//   Button,
//   Container,
//   Paper,
//   PasswordInput,
//   SegmentedControl,
//   Text,
//   TextInput,
//   Title,
// } from '@mantine/core';
// import { useForm } from '@mantine/form';
// import type { Role } from '@shared/types/auth/Role';
// import Roles from '@shared/types/auth/Role';
// import { IconInfoCircle } from '@tabler/icons-react';
// import Link from 'next/link';
// import { useRouter } from 'next/router';
// import { useState } from 'react';

import { Course } from '@shared/types/Course';

interface JiraInfoProps {
  course: Course;
  onUpdate: () => void;
}

const JiraInfo: React.FC<JiraInfoProps> = ({ course, onUpdate }) => {
  const handleOAuthButtonClick = () => {
    // Redirect the user to the backend /jira/authorize endpoint
    const apiRoute = `/api/jira/authorize?course=${course._id}`;
    window.location.href = apiRoute; // Update with your backend URL
  };

  return (
    <div>
      <h1>Welcome to Your App</h1>
      {/* Render button if Atlassian account is not registered */}
      {course.jira.isRegistered || <button onClick={handleOAuthButtonClick}>Authorize with Jira</button>}
    </div>
  );
};

export default JiraInfo;
