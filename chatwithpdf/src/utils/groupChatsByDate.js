export function groupChatsByDate(sessions = []) {
  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  sessions.forEach((session) => {
    const time = new Date(session.updatedAt || session.createdAt).getTime();
    if (time >= todayStart) {
      groups.Today.push(session);
    } else if (time >= yesterdayStart) {
      groups.Yesterday.push(session);
    } else if (time >= weekStart) {
      groups['Previous 7 Days'].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  // Return non-empty groups in order
  const result = [];
  ['Today', 'Yesterday', 'Previous 7 Days', 'Older'].forEach((key) => {
    if (groups[key].length > 0) {
      result.push({ label: key, items: groups[key] });
    }
  });

  return result;
}
