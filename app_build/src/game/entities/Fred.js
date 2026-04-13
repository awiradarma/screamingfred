import * as Phaser from 'phaser';
import SonicRing from './SonicRing';

export default class Fred extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fred'); 
        this.setDisplaySize(64, 64);
        this.setOrigin(0.5, 0.35);
        this.scene = scene;

        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Config physics
        this.body.setCollideWorldBounds(true);
        this.body.setGravityY(500); // Heavy, crisp gravity
        
        // Movement constants
        this.runSpeed = 220;
        this.jumpVelocity = -480;

        // Input Setup
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.screamKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    update() {
        if (!this.body) return;

        // Horizontal Movement
        if (this.cursors.left.isDown) {
            this.body.setVelocityX(-this.runSpeed);
            this.setFlipX(false);
        } else if (this.cursors.right.isDown) {
            this.body.setVelocityX(this.runSpeed);
            this.setFlipX(true);
        } else {
            this.body.setVelocityX(0); // Frictionless stop
        }

        // Jumping
        if ((this.cursors.up.isDown || this.cursors.space.isDown) && this.body.onFloor()) {
            this.body.setVelocityY(this.jumpVelocity);
        }

        // Sonic Scream
        if (Phaser.Input.Keyboard.JustDown(this.screamKey)) {
            this.fireScream();
        }
    }

    fireScream() {
        const ring = new SonicRing(this.scene, this.x, this.y);
        this.scene.sonicRings.add(ring);
    }
}
