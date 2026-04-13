import React, { useEffect, useRef } from 'react';
import { createGame } from '../game/GameManager';

export default function Game() {
    const gameContainer = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        if (!gameRef.current && gameContainer.current) {
            gameRef.current = createGame(gameContainer.current);
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <div 
            id="game-container" 
            ref={gameContainer} 
            className="phaser-container"
        />
    );
}
