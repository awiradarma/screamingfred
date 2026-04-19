import { db } from './config';
import { collection, doc, setDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';

const WORLD_ROOMS_COLLECTION = 'world_rooms';
const REGION_THEMES_COLLECTION = 'region_themes';

/**
 * Save or update a room at specific world coordinates.
 */
export const saveRoomToWorld = async (x, y, roomData) => {
    const coordKey = `${x},${y}`;
    
    try {
        // Deep clone and ensure it's a POJO
        const cleanData = JSON.parse(JSON.stringify(roomData));
        
        // Firestore doesn't support nested arrays. 
        // We automatically stringify ANY top-level field that is an array.
        // This is the most robust way to handle grid, entities, npcs, etc.
        Object.keys(cleanData).forEach(key => {
            if (Array.isArray(cleanData[key])) {
                cleanData[key] = JSON.stringify(cleanData[key]);
            }
        });

        await setDoc(doc(db, WORLD_ROOMS_COLLECTION, coordKey), {
            ...cleanData,
            world_x: x,
            world_y: y,
            updatedAt: serverTimestamp()
        });
        console.log(`Room saved to world at ${coordKey}`);
        return coordKey;
    } catch (e) {
        console.error("Error saving world room:", e);
        throw e;
    }
};

/**
 * Fetch all rooms currently assigned to the world.
 */
export const fetchWorldRooms = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, WORLD_ROOMS_COLLECTION));
        const rooms = {};
        querySnapshot.forEach((snap) => {
            const data = snap.data();
            
            // Automatically parse any string field that looks like a JSON array/object
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string' && (data[key].startsWith('[') || data[key].startsWith('{'))) {
                    try {
                        data[key] = JSON.parse(data[key]);
                    } catch (e) {
                        // Not valid JSON, keep as string
                    }
                }
            });

            // Backward compatibility for the 1D grid attempt (deprecated)
            if (data.grid && !Array.isArray(data.grid[0]) && data.gridSize) {
                const grid = [];
                for (let i = 0; i < data.grid.length; i += data.gridSize) {
                   grid.push(data.grid.slice(i, i + data.gridSize));
                }
                data.grid = grid;
            }
            
            rooms[snap.id] = data;
        });
        return rooms;
    } catch (e) {
        console.error("Error fetching world rooms:", e);
        throw e;
    }
};

/**
 * Assign a theme to a specific coordinate (Admin tool).
 */
export const setRegionTheme = async (x, y, theme) => {
    const coordKey = `${x},${y}`;
    try {
        await setDoc(doc(db, REGION_THEMES_COLLECTION, coordKey), {
            theme,
            x,
            y,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error setting region theme:", e);
        throw e;
    }
};

/**
 * Get the assigned theme for a coordinate.
 */
export const getRegionTheme = async (x, y) => {
    const coordKey = `${x},${y}`;
    try {
        const docSnap = await getDoc(doc(db, REGION_THEMES_COLLECTION, coordKey));
        return docSnap.exists() ? docSnap.data().theme : null;
    } catch (e) {
        console.error("Error fetching region theme:", e);
        return null;
    }
};
