import { useStore } from '../../store/useStore';

export const STATES = {
    NORMAL: 'NORMAL',
    BANANA: 'BANANA'
};

export default class TransformationManager {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.currentState = STATES.NORMAL;
        this.consumptionRate = 0.5; // Creativity per frame
    }

    setTransformation(state) {
        if (this.currentState === state) return;

        const { creativityMeter } = useStore.getState();

        if (state === STATES.BANANA) {
            if (creativityMeter < 20) return; // Need minimum charge to transform
            
            this.currentState = STATES.BANANA;
            this.player.setTexture('fred_banana'); // Placeholder or actual asset
            this.player.setDisplaySize(64, 32); // Flat banana
            this.player.body.setImmovable(true);
            this.player.body.setAllowGravity(false);
            this.player.body.setVelocity(0, 0);
        } else {
            this.currentState = STATES.NORMAL;
            this.player.setTexture('fred');
            this.player.setDisplaySize(64, 64);
            this.player.body.setImmovable(false);
            this.player.body.setAllowGravity(true);
        }
    }

    update() {
        if (this.currentState === STATES.BANANA) {
            const { creativityMeter, setCreativity } = useStore.getState();
            if (creativityMeter <= 0) {
                this.setTransformation(STATES.NORMAL);
            } else {
                setCreativity(creativityMeter - this.consumptionRate);
            }
        } else {
            const { creativityMeter, setCreativity } = useStore.getState();
            if (creativityMeter < 100) {
                setCreativity(creativityMeter + 0.1);
            }
        }
    }
}
