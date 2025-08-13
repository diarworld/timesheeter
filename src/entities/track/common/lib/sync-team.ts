import { TYandexUser } from 'entities/user/yandex/model/types';

export const syncTeamToDb = async (teamArr: TYandexUser[], currentUser: TYandexUser, teamId?: string) => {
  if (!currentUser) return;
  
  // If no teamId provided, try to get from localStorage
  let targetTeamId = teamId;
  if (!targetTeamId) {
    const storedTeamId = localStorage.getItem('teamId');
    targetTeamId = storedTeamId || undefined;
    if (targetTeamId && !targetTeamId.match(/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/)) {
      localStorage.removeItem('teamId');
      targetTeamId = undefined;
    }
  }
  
  try {
    const method = targetTeamId ? 'PATCH' : 'POST';
    const body = targetTeamId 
      ? JSON.stringify({ teamId: targetTeamId, members: teamArr }) 
      : JSON.stringify({ members: teamArr });
      
    const res = await fetch('/api/team', {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.uid?.toString() || '',
        'x-user-email': currentUser?.email || '',
        'x-user-display': currentUser?.display ? encodeURIComponent(currentUser.display) : '',
      },
      body,
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.teamId && !targetTeamId) {
        localStorage.setItem('teamId', data.teamId);
      }
    } else {
      console.error('Error syncing team to db', res.status);
      if (!targetTeamId) {
        localStorage.removeItem('teamId');
      }
    }
  } catch (e) {
    console.error('Error syncing team to db', e);
  }
};
