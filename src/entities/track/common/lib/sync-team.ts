import { TYandexUser } from "entities/user/yandex/model/types";

export const syncTeamToDb = async (teamArr: TYandexUser[], currentUser: TYandexUser) => {
  // console.log('syncing team to db');
  // console.log('teamArr', teamArr);
  // const ldapCredentials = JSON.parse(localStorage.getItem('ldapCredentials') || '{}');
  // const currentUser = teamArr.find(
  //   (teamMember) => teamMember.email === ldapCredentials.username || teamMember.login === ldapCredentials.username,
  // );
  // console.log('currentUser', currentUser);
  if (!currentUser) return;
  let teamId = localStorage.getItem('teamId');
  if (teamId && !teamId.match(/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/)) {
    // return;
    // console.log('Wrong teamId', teamId);
    localStorage.removeItem('teamId');
    teamId = null;
  }
  try {
    const method = teamId ? 'PATCH' : 'POST';
    const body = teamId ? JSON.stringify({ teamId, members: teamArr }) : JSON.stringify({ members: teamArr });
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
      if (data.teamId) {
        localStorage.setItem('teamId', data.teamId);
      }
    } else {
      console.error('Error syncing team to db', res.status);
      localStorage.removeItem('teamId');
    }
  } catch (e) {
    console.error('Error syncing team to db', e);
  }
};