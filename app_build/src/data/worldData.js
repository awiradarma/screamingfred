import forest_entrance from './testRoom.json';
import whispering_groove from './whisperingGroove.json';
import hidden_glade from './hiddenGlade.json';

export const worldData = {
  forest_entrance,
  whispering_groove,
  hidden_glade,
};

export function getRoomData(roomId) {
  return worldData[roomId] || null;
}
