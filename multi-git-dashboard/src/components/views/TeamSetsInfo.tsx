import {
  Button,
  Container,
  Group,
  Modal,
  Notification,
  Tabs,
} from '@mantine/core';
import { Course } from '@shared/types/Course';
import { TeamSet } from '@shared/types/TeamSet';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import TeamCard from '../cards/TeamCard';
import StudentTeamForm from '../forms/StudentTeamForm';
import TATeamForm from '../forms/TATeamForm';
import TeamSetForm from '../forms/TeamSetForm';
import { TeamData } from '@shared/types/TeamData';
import { hasFacultyPermission } from '@/lib/utils';

interface TeamsInfoProps {
  course: Course;
  teamsData: TeamData[];
  onUpdate: () => void;
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({
  course,
  teamsData,
  onUpdate,
}) => {
  const [isCreatingTeamSet, setIsCreatingTeamSet] = useState<boolean>(false);
  const [isAddingStudents, setIsAddingStudents] = useState<boolean>(false);
  const [isAddingTAs, setIsAddingTAs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [teamSetId, setTeamSetId] = useState<string | null>(null);

  const { data: session } = useSession();

  const teamCards = (teamSet: TeamSet) =>
    teamSet.teams.map(team => (
      <TeamCard
        key={team._id}
        teamId={team._id}
        number={team.number}
        TA={team.TA}
        TAs={course.TAs}
        teamData={team.teamData}
        teamDataList={teamsData}
        members={team.members}
        onTeamDeleted={onUpdate}
      />
    ));

  const headers = course.teamSets.map((teamSet, index) => (
    <Tabs.Tab
      key={index}
      value={teamSet.name}
      onClick={() => {
        setActiveTab(teamSet.name);
        setTeamSetId(teamSet._id);
      }}
    >
      {teamSet.name}
    </Tabs.Tab>
  ));

  const panels = course.teamSets.map(teamSet => (
    <Tabs.Panel key={teamSet._id} value={teamSet.name}>
      {teamCards(teamSet)}
    </Tabs.Panel>
  ));

  const toggleTeamSetForm = () => {
    setIsCreatingTeamSet(o => !o);
  };

  const handleTeamSetCreated = () => {
    setIsCreatingTeamSet(false);
    onUpdate();
  };

  const toggleAddStudentsForm = () => {
    setIsAddingStudents(o => !o);
  };

  const handleAddStudentsUploaded = () => {
    setIsAddingStudents(false);
    onUpdate();
  };

  const toggleAddTAsForm = () => {
    setIsAddingTAs(o => !o);
  };

  const handleAddTAsUploaded = () => {
    setIsAddingTAs(false);
    onUpdate();
  };

  const handleDeleteTeamSet = async () => {
    try {
      const apiRoute = `/api/teamsets/${teamSetId}`;
      const response = await fetch(apiRoute, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Error deleting TeamSet:', response.statusText);
        setError('Error deleting TeamSet. Please try again.');
        return;
      }
      setIsCreatingTeamSet(false);
      setIsAddingStudents(false);
      setIsAddingTAs(false);
      setActiveTab(null);
      setTeamSetId(null);
      console.log('TeamSet deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting TeamSet:', error);
      setError('Error deleting TeamSet. Please try again.');
    }
  };

  return (
    <Container>
      <Tabs value={activeTab}>
        <Tabs.List style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          {headers}
        </Tabs.List>
        {error && (
          <Notification
            title="Error"
            color="red"
            onClose={() => setError(null)}
          >
            {error}
          </Notification>
        )}
        {hasFacultyPermission(session) && (
          <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
            <Group>
              <Button onClick={toggleTeamSetForm}>Create TeamSet</Button>
              {activeTab && (
                <Button onClick={toggleAddStudentsForm}>Add Students</Button>
              )}
              {activeTab && <Button onClick={toggleAddTAsForm}>Add TAs</Button>}
            </Group>

            {teamSetId && (
              <Button color="red" onClick={handleDeleteTeamSet}>
                Delete TeamSet
              </Button>
            )}
          </Group>
        )}
        <Modal
          opened={isCreatingTeamSet}
          onClose={toggleTeamSetForm}
          title="Create TeamSet"
        >
          <TeamSetForm
            courseId={course._id}
            onTeamSetCreated={handleTeamSetCreated}
          />
        </Modal>

        {activeTab && (
          <Modal
            opened={isAddingStudents}
            onClose={toggleAddStudentsForm}
            title="Add Students"
          >
            <StudentTeamForm
              courseId={course._id}
              teamSet={activeTab}
              onTeamCreated={handleAddStudentsUploaded}
            />
          </Modal>
        )}

        {activeTab && (
          <Modal
            opened={isAddingTAs}
            onClose={toggleAddTAsForm}
            title="Add TAs"
          >
            <TATeamForm
              courseId={course._id}
              teamSet={activeTab}
              onTeamCreated={handleAddTAsUploaded}
            />
          </Modal>
        )}

        {panels}
      </Tabs>
    </Container>
  );
};

export default TeamsInfo;
