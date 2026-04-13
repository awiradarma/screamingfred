import * as Phaser from 'phaser';

export default class SonicRing extends Phaser.GameObjects.Graphics {
    constructor(scene, x, y) {
        super(scene, { x, y });
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setCircle(10);
        this.body.setOffset(-10, -10);
        this.body.setAllowGravity(false);

        // Create a custom object to tween independent variables
        const tweenConfig = { radius: 10, alpha: 1 };

        scene.tweens.add({
            targets: tweenConfig,
            radius: 175,
            alpha: 0,
            duration: 650,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                if (this.body) {
                    this.body.setCircle(tweenConfig.radius);
                    this.body.setOffset(-tweenConfig.radius, -tweenConfig.radius);
                }
                
                // Draw the stroke identically to the body boundaries
                this.clear();
                this.lineStyle(4, 0x00e5ff, tweenConfig.alpha);
                this.strokeCircle(0, 0, tweenConfig.radius);
            },
            onComplete: () => {
                this.destroy(); 
            }
        });
    }
}
