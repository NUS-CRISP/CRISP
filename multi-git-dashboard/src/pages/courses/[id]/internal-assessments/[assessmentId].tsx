import { Container, Tabs } from '@mantine/core';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import AssessmentInternalOverview from '@/components/views/AssessmentInternalOverview';
import AssessmentInternalForm from '@/components/views/AssessmentInternalForm';
import AssessmentInternalResults from '@/components/views/AssessmentInternalResults';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { User } from '@shared/types/User';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Question } from '@shared/types/Question';
import { Team } from '@shared/types/Team';

const InternalAssessmentDetail: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };
  const assessmentsApiRoute = `/api/internal-assessments/${assessmentId}`;
  const questionsApiRoute = `/api/internal-assessments/${assessmentId}/questions`;
  const teachingTeamApiRoute = `/api/courses/${id}/teachingteam`;

  const [userIdToNameMap, setUserIdToNameMap] = useState<{ [key: string]: string }>({});
  const [assessment, setAssessment] = useState<InternalAssessment | null>(null);
  const [teachingTeam, setTeachingTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const permission = hasFacultyPermission();

  const fetchTeamsAndCreateUserMap = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/course/${id}`);
      if (!response.ok) {
        console.error('Error fetching teams:', response.statusText);
        return;
      }
      const teams: Team[] = await response.json();
      const userMap: { [key: string]: string } = {};
      teams.forEach((team) => {
        team.members.forEach((member) => {
          userMap[member._id] = member.name;
        });
      });
      setUserIdToNameMap(userMap);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, [id]);

  const fetchAssessment = useCallback(async () => {
    try {
      const response = await fetch(assessmentsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching assessment:', response.statusText);
        return;
      }
      const data: InternalAssessment = await response.json();
      setAssessment(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  }, [assessmentsApiRoute]);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(questionsApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching questions:', response.statusText);
        return;
      }
      const data: Question[] = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  }, [questionsApiRoute]);

  const fetchTeachingTeam = useCallback(async () => {
    try {
      const response = await fetch(teachingTeamApiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error('Error fetching Teaching Team:', response.statusText);
        return;
      }
      const data: User[] = await response.json();
      setTeachingTeam(data);
    } catch (error) {
      console.error('Error fetching Teaching Team:', error);
    }
  }, [teachingTeamApiRoute]);

  const setActiveTabAndSave = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem(`activeAssessmentTab_${assessmentId}`, tabName);
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(`activeAssessmentTab_${assessmentId}`);
    if (savedTab && ['Overview', 'Questions', 'Internal Results'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (router.isReady) {
      fetchAssessment();
      fetchQuestions();
      fetchTeachingTeam();
      fetchTeamsAndCreateUserMap();
    }
  }, [router.isReady, fetchAssessment, fetchQuestions, fetchTeachingTeam, fetchTeamsAndCreateUserMap]);

  const addQuestion = () => {
    const newQuestion: Question = {
      _id: `temp-${Date.now()}`,
      text: '',
      type: 'Undecided',
      isLocked: false,
      isRequired: true,
      customInstruction: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleSaveQuestion = async (id: string, updatedQuestion: Question) => {
    try {
      if (id.startsWith('temp-')) {
        // New question, send POST request
        const response = await fetch(questionsApiRoute, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...updatedQuestion,
          }),
        });
        if (!response.ok) {
          console.error('Error adding question:', response.statusText);
          return;
        }
        const createdQuestion: Question = await response.json();
        // Replace the local question with the one from the backend
        setQuestions(questions.map((q) => (q._id === id ? createdQuestion : q)));
      } else {
        // Existing question, send PATCH request
        const response = await fetch(`${questionsApiRoute}/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedQuestion),
        });
        if (!response.ok) {
          console.error('Error updating question:', response.statusText);
          return;
        }
        const updatedQuestionFromServer: Question = await response.json();
        setQuestions(questions.map((q) => (q._id === id ? updatedQuestionFromServer : q)));
      }
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const questionToDelete = questions.find((q) => q._id === id);
    if (!questionToDelete) {
      console.error('Question not found');
      return;
    }
    if (id.startsWith('temp-')) {
      // Unsaved question, just remove it from local state
      setQuestions(questions.filter((q) => q._id !== id));
    } else {
      try {
        const response = await fetch(`${questionsApiRoute}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          console.error('Error deleting question:', response.statusText);
          return;
        }
        setQuestions(questions.filter((q) => q._id !== id));
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  return (
    <Container>
      <Tabs value={activeTab}>
        <Tabs.List>
          <Tabs.Tab value='Overview' onClick={() => setActiveTabAndSave('Overview')}>
            Overview
          </Tabs.Tab>

          {permission && (
            <Tabs.Tab value='Questions' onClick={() => setActiveTabAndSave('Questions')}>
              Questions
            </Tabs.Tab>
          )}

          {permission && (
            <Tabs.Tab value='Internal Results' onClick={() => setActiveTabAndSave('Internal Results')}>
              Results
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value='Overview'>
          {id && (
            <AssessmentInternalOverview
              courseId={id}
              assessment={assessment}
              hasFacultyPermission={permission}
              onUpdateAssessment={fetchAssessment}
              questions={questions}
              userIdToNameMap={userIdToNameMap}
            />
          )}
        </Tabs.Panel>

        {permission && (
          <Tabs.Panel value='Questions'>
            <AssessmentInternalForm
              assessment={assessment}
              questions={questions}
              addQuestion={addQuestion}
              handleSaveQuestion={handleSaveQuestion}
              handleDeleteQuestion={handleDeleteQuestion}
              onAssessmentUpdated={fetchAssessment}
            />
          </Tabs.Panel>
        )}

        {permission && (
          <Tabs.Panel value='Internal Results'>
            <AssessmentInternalResults
              assessmentId={assessmentId}
              teachingTeam={teachingTeam}
              results={assessment?.results || []}
            />
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  );
};

export default InternalAssessmentDetail;
