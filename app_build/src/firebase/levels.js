import { db } from './config';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const LEVELS_COLLECTION = 'levels';

export const publishLevel = async (schema, authorId) => {
    try {
        const docRef = await addDoc(collection(db, LEVELS_COLLECTION), {
            ...schema,
            authorId,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        console.log("Level published with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

export const fetchCommunityLevels = async () => {
    try {
        const q = query(collection(db, LEVELS_COLLECTION), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        const levels = [];
        querySnapshot.forEach((doc) => {
            levels.push({ id: doc.id, ...doc.data() });
        });
        return levels;
    } catch (e) {
        console.error("Error fetching documents: ", e);
        throw e;
    }
};
