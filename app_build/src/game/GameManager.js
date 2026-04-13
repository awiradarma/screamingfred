import * as Phaser from 'phaser';
import MainScene from './scenes/MainScene';

export function createGame(parentElement) {
    const config = {
        type: Phaser.AUTO,
        parent: parentElement,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 832,
            height: 640
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 300 },
                debug: true
            }
        },
        scene: [MainScene],
        backgroundColor: '#111111'
    };

    return new Phaser.Game(config);
}
