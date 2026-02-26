import { Profile } from '@shared/types/Profile';
import { Team as SharedTeam } from '@shared/types/Team';

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string; // TeamData not populated
}

export type ProfileGetter = (gitHandle: string) => Promise<Profile>;
