import {
  Button,
  Container,
  Group,
  Modal,
  Notification,
  Tabs,
} from '@mantine/core';
import { TeamSet } from '@shared/types/TeamSet';
import { useEffect, useState } from 'react';
import TeamCard from '../cards/TeamCard';
import StudentTeamForm from '../forms/StudentTeamForm';
import TATeamForm from '../forms/TATeamForm';
import TeamSetForm from '../forms/TeamSetForm';
import { User } from '@shared/types/User';
import { TeamData } from '@shared/types/TeamData';

interface TeamsInfoProps {
  courseId: string;
  teamSets: TeamSet[];
  teachingTeam: User[];
  teamDatas: TeamData[];
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({
  courseId,
  teamSets,
  teachingTeam,
  teamDatas,
  hasFacultyPermission,
  onUpdate,
}) => {
  const [isCreatingTeamSet, setIsCreatingTeamSet] = useState<boolean>(false);
  const [isAddingStudents, setIsAddingStudents] = useState<boolean>(false);
  const [isAddingTAs, setIsAddingTAs] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(
    teamSets ? teamSets[0]?.name : null
  );
  const [teamSetId, setTeamSetId] = useState<string | null>(null);

  const toggleTeamSetForm = () => {
    setIsCreatingTeamSet(o => !o);
  };

  const handleTeamSetCreated = (teamSetName: string) => {
    setIsCreatingTeamSet(false);
    onUpdate();
    setActiveTabAndSave(teamSetName);
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

  const toggleIsEditing = () => setIsEditing(!isEditing);

  const handleAddTAsUploaded = () => {
    setIsAddingTAs(false);
    onUpdate();
  };

  const setActiveTabAndSave = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem(`activeTeamSetTab_${courseId}`, tabName);
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(`activeTeamSetTab_${courseId}`);
    if (savedTab && teamSets.some(teamSet => teamSet.name === savedTab)) {
      setActiveTab(savedTab);
    }
  }, [teamSets]);

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
      onUpdate();
    } catch (error) {
      console.error('Error deleting TeamSet:', error);
      setError('Error deleting TeamSet. Please try again.');
    }
  };

  const teamCards = (teamSet: TeamSet) => {
    return teamSet.teams.map(team => (
      <TeamCard
        key={team._id}
        teamId={team._id}
        number={team.number}
        TA={team.TA}
        teachingTeam={teachingTeam}
        teamData={team.teamData}
        teamDataList={teamDatas}
        members={team.members}
        onUpdate={onUpdate}
        isEditing={isEditing}
      />
    ));
  };

  const headers = teamSets.map((teamSet, index) => (
    <Tabs.Tab
      key={index}
      value={teamSet.name}
      onClick={() => {
        setActiveTabAndSave(teamSet.name);
        setTeamSetId(teamSet._id);
      }}
    >
      {teamSet.name}
    </Tabs.Tab>
  ));

  const panels = teamSets.map(teamSet => (
    <Tabs.Panel key={teamSet._id} value={teamSet.name}>
      {teamCards(teamSet)}
    </Tabs.Panel>
  ));

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
        {hasFacultyPermission && (
          <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
            <Group>
              <Button onClick={toggleTeamSetForm}>Create TeamSet</Button>
              {activeTab && (
                <Button onClick={toggleAddStudentsForm}>Assign Students</Button>
              )}
              {activeTab && (
                <Button onClick={toggleAddTAsForm}>Assign TAs</Button>
              )}
              {activeTab && (
                <Button onClick={toggleIsEditing}>
                  {isEditing ? 'Finish Edit' : 'Edit Teams'}
                </Button>
              )}
            </Group>

            {teamSetId && isEditing && (
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
            courseId={courseId}
            onTeamSetCreated={handleTeamSetCreated}
          />
        </Modal>

        {activeTab && (
          <Modal
            opened={isAddingStudents}
            onClose={toggleAddStudentsForm}
            title="Assign Students"
          >
            <StudentTeamForm
              courseId={courseId}
              teamSet={activeTab}
              onTeamCreated={handleAddStudentsUploaded}
            />
          </Modal>
        )}

        {activeTab && (
          <Modal
            opened={isAddingTAs}
            onClose={toggleAddTAsForm}
            title="Assign TAs"
          >
            <TATeamForm
              courseId={courseId}
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
