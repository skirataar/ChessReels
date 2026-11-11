import { describe, it, expect } from 'vitest';
import {
  getInitialPlacementState,
  processPlacementMove,
  TOTAL_PLACEMENT_STEPS,
  INITIAL_PLACEMENT_ELO,
} from '../lib/placementEngine';

describe('Placement Engine Stepladder & Calibration', () => {
  it('starts at initial baseline rating of 1000', () => {
    const state = getInitialPlacementState();
    expect(state.currentStep).toBe(1);
    expect(state.currentPuzzleElo).toBe(INITIAL_PLACEMENT_ELO);
    expect(state.isComplete).toBe(false);
  });

  it('jumps +200 on every solve across 6 straight wins', () => {
    let state = getInitialPlacementState();
    const expectedTargets = [1000, 1200, 1400, 1600, 1800, 2000];

    for (let i = 0; i < 6; i++) {
      expect(state.currentPuzzleElo).toBe(expectedTargets[i]);
      state = processPlacementMove(state, `puzzle-${i}`, true);
    }

    expect(state.isComplete).toBe(true);
    expect(state.history.length).toBe(6);
    expect(state.calibratedElo).toBeGreaterThanOrEqual(1800);
  });

  it('drops -150 on blunder/failure', () => {
    let state = getInitialPlacementState(); // 1000
    state = processPlacementMove(state, 'p1', false); // drops to 850
    expect(state.currentPuzzleElo).toBe(850);
    expect(state.currentStep).toBe(2);

    state = processPlacementMove(state, 'p2', true); // rises +200 -> 1050
    expect(state.currentPuzzleElo).toBe(1050);
  });

  it('never yields standard micro-deltas like +13 or +18', () => {
    let state = getInitialPlacementState();
    const nextState = processPlacementMove(state, 'p1', true);
    const delta = nextState.currentPuzzleElo - state.currentPuzzleElo;
    expect(delta).toBe(200); // Must be strictly 200, not damped Glicko
  });

  it('clamps final Elo within safe bounds [600, 2200]', () => {
    let lossState = getInitialPlacementState();
    for (let i = 0; i < 6; i++) {
      lossState = processPlacementMove(lossState, `p-${i}`, false);
    }
    expect(lossState.calibratedElo).toBeGreaterThanOrEqual(600);
  });
});
