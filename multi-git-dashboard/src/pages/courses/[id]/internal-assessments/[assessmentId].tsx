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
import {
  AssignedTeam,
  AssignedUser,
} from '@shared/types/AssessmentAssignmentSet';
import { Team } from '@shared/types/Team';
import { AssessmentResult } from '@shared/types/AssessmentResults';
import TakeAssessmentInline from '@/components/views/TakeAssessmentInline';

const InternalAssessmentDetail: React.FC = () => {
  const router = useRouter();
  const { id, assessmentId } = router.query as {
    id: string;
    assessmentId: string;
  };
  const assessmentsApiRoute = `/api/internal-assessments/${assessmentId}`;
  const questionsApiRoute = `/api/internal-assessments/${assessmentId}/questions`;
  const teachingTeamApiRoute = `/api/courses/${id}/teachingteam`;

  const [showTakeAssessment, setShowTakeAssessment] = useState(false);
  const [userIdToNameMap, setUserIdToNameMap] = useState<{
    [key: string]: string;
  }>({});
  const [assignedTeams, setAssignedTeams] = useState<AssignedTeam[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [assessment, setAssessment] = useState<InternalAssessment | null>(null);
  const [teachingTeam, setTeachingTeam] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<
    AssessmentResult[]
  >([]);
  const permission = hasFacultyPermission();

  const fetchTeamsAndCreateUserMap = useCallback(async () => {
    try {
      if (!assessment) {
        return;
      }

      if (assessment.granularity === 'team') {
        let assignedTeams: AssignedTeam[] = [];
        const response = await fetch(
          `/api/internal-assessments/${assessmentId}/assignment-sets`
        );
        if (response.ok) {
          assignedTeams = await response.json();
        }

        if (!response.ok || assignedTeams === null) {
          const fallbackResponse = await fetch(`/api/teams/course/${id}`);
          if (!fallbackResponse.ok && response !== null) {
            console.error(
              'Error fetching teams from fallback:',
              fallbackResponse.statusText
            );
            alert('Failed to load team data. Please try again.');
            return;
          }
          const teams: Team[] = await fallbackResponse.json();

          assignedTeams = teams.map(
            team =>
              ({
                team,
                tas: team.TA ? [team.TA] : [],
              }) as AssignedTeam
          );
        }

        const userMap: { [key: string]: string } = {};
        assignedTeams.forEach((assignedTeam: AssignedTeam) => {
          assignedTeam.team.members.forEach((member: User) => {
            userMap[member._id] = member.name;
          });
          assignedTeam.tas.forEach((ta: User) => {
            userMap[ta._id] = ta.name;
          });
        });

        setAssignedTeams(assignedTeams);
        setUserIdToNameMap(userMap);
      } else if (assessment.granularity === 'individual') {
        let assignedUsers: AssignedUser[] = [];
        const response = await fetch(
          `/api/internal-assessments/${assessmentId}/assignment-sets`
        );
        if (response.ok) {
          assignedUsers = await response.json();
        }

        if (!response.ok || assignedUsers === null) {
          const fallbackResponse = await fetch(`/api/teams/course/${id}`);
          if (!fallbackResponse.ok) {
            console.error(
              'Error fetching teams from fallback:',
              fallbackResponse.statusText
            );
            alert('Failed to load individual assignments. Please try again.');
            return;
          }
          const teams: Team[] = await fallbackResponse.json();

          assignedUsers = teams.flatMap(team =>
            team.members.map(member => {
              return {
                user: member,
                tas: team.TA ? [team.TA] : [],
              } as AssignedUser;
            })
          );
        }

        const userMap: { [key: string]: string } = {};
        assignedUsers.forEach((assignedUser: AssignedUser) => {
          userMap[assignedUser.user._id] = assignedUser.user.name;
          assignedUser.tas.forEach(ta => {
            userMap[ta._id] = ta.name;
          });
        });

        setAssignedUsers(assignedUsers);
        setUserIdToNameMap(userMap);
      }
    } catch (error) {
      console.error('Error fetching teams or users:', error);
      alert('An error occurred while fetching team or user data.');
    }
  }, [assessment, assessmentId, id]);

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
        alert('Failed to load assessment data. Please try again.');
        return;
      }
      const data: InternalAssessment = await response.json();
      setAssessment(data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('An error occurred while fetching the assessment.');
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
        alert('Failed to load questions. Please try again.');
        return;
      }
      const data: Question[] = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('An error occurred while fetching questions.');
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
        alert('Failed to load teaching team data. Please try again.');
        return;
      }
      const data: User[] = await response.json();
      setTeachingTeam(data);
    } catch (error) {
      console.error('Error fetching Teaching Team:', error);
      alert('An error occurred while fetching teaching team data.');
    }
  }, [teachingTeamApiRoute]);

  const fetchAssessmentResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/assessment-results/${assessmentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error(
          'Error fetching assessment results:',
          response.statusText
        );
        alert('Failed to load assessment results. Please try again.');
        return;
      }
      const data: AssessmentResult[] = (await response.json()).data;
      setAssessmentResults(data);
    } catch (error) {
      console.error('Error fetching assessment results:', error);
      alert('An error occurred while fetching assessment results.');
    }
  }, [assessmentId]);

  const setActiveTabAndSave = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem(`activeAssessmentTab_${assessmentId}`, tabName);
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(
      `activeAssessmentTab_${assessmentId}`
    );
    if (
      savedTab &&
      ['Overview', 'Questions', 'Internal Results'].includes(savedTab)
    ) {
      setActiveTab(savedTab);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (router.isReady) {
      fetchAssessment();
    }
  }, [router.isReady, fetchAssessment]);

  useEffect(() => {
    if (assessment) {
      fetchQuestions();
      fetchTeachingTeam();
      fetchTeamsAndCreateUserMap();
      if (permission) {
        fetchAssessmentResults();
      }
    }
  }, [
    assessment,
    fetchQuestions,
    fetchTeachingTeam,
    fetchTeamsAndCreateUserMap,
    fetchAssessmentResults,
    permission,
  ]);

  const addQuestion = (qNo: number): Question => {
    const newQuestion: Question = {
      _id: `temp-${Date.now()}`,
      text: '',
      type: 'Undecided',
      order: qNo,
      isLocked: false,
      isRequired: true,
      customInstruction: '',
    };
    setQuestions([...questions, newQuestion]);
    return newQuestion;
  };

  const handleSaveQuestion = async (id: string, updatedQuestion: Question) => {
    try {
      if (id.startsWith('temp-')) {
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
        setQuestions(questions.map(q => (q._id === id ? createdQuestion : q)));
      } else {
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
        setQuestions(
          questions.map(q => (q._id === id ? updatedQuestionFromServer : q))
        );
      }
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const questionToDelete = questions.find(q => q._id === id);
    if (!questionToDelete) {
      console.error('Question not found');
      return;
    }
    if (id.startsWith('temp-')) {
      setQuestions(questions.filter(q => q._id !== id));
    } else {
      try {
        const response = await fetch(`${questionsApiRoute}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          console.error('Error deleting question:', response.statusText);
          return;
        }
        setQuestions(questions.filter(q => q._id !== id));
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  const studentIdToTeamNumber: { [studentId: string]: number } = {};
  assignedTeams.forEach(assignedTeam => {
    const teamNumber = assignedTeam.team.number;
    assignedTeam.team.members.forEach(member => {
      studentIdToTeamNumber[member._id] = teamNumber;
    });
  });

  return (
    <Container>
      {showTakeAssessment ? (
        <TakeAssessmentInline
          courseId={id}
          assessmentId={assessmentId}
          onReturnToOverview={() => setShowTakeAssessment(false)}
        />
      ) : (
        <Tabs value={activeTab}>
          <Tabs.List>
            <Tabs.Tab
              value="Overview"
              onClick={() => setActiveTabAndSave('Overview')}
            >
              Overview
            </Tabs.Tab>

            {permission && (
              <Tabs.Tab
                value="Questions"
                onClick={() => setActiveTabAndSave('Questions')}
              >
                Questions
              </Tabs.Tab>
            )}

            {permission && (
              <Tabs.Tab
                value="Internal Results"
                onClick={() => setActiveTabAndSave('Internal Results')}
              >
                Results
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="Overview">
            {id &&
              assessment &&
              ((assignedTeams && assignedTeams.length > 0) ||
                (assignedUsers && assignedUsers.length > 0)) && (
                <AssessmentInternalOverview
                  courseId={id}
                  assessment={assessment}
                  hasFacultyPermission={permission}
                  onUpdateAssessment={fetchAssessment}
                  questions={questions}
                  userIdToNameMap={userIdToNameMap}
                  teachingStaff={teachingTeam}
                  initialAssignedTeams={
                    assessment.granularity === 'team'
                      ? assignedTeams
                      : undefined
                  }
                  initialAssignedUsers={
                    assessment.granularity === 'individual'
                      ? assignedUsers
                      : undefined
                  }
                  onTakeAssessmentClicked={() => setShowTakeAssessment(true)}
                />
              )}
          </Tabs.Panel>

          {permission && (
            <Tabs.Panel value="Questions">
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

          {permission &&
            assessmentResults &&
            assessmentResults.length > 0 &&
            assessment && (
              <Tabs.Panel value="Internal Results">
                <AssessmentInternalResults
                  teachingTeam={teachingTeam}
                  results={assessmentResults}
                  assignedTeams={assignedTeams}
                  assignedUsers={assignedUsers}
                  maxScore={assessment.maxMarks}
                  assessmentReleaseNumber={assessment.releaseNumber}
                />
              </Tabs.Panel>
            )}
        </Tabs>
      )}
    </Container>
  );
};

export default InternalAssessmentDetail;
