import { describe, it, expect } from 'vitest';
import {
  getInitialPlacementState,
  processPlacementMove,
  calculateFinalPlacementElo,
  TOTAL_PLACEMENT_STEPS,
  INITIAL_PLACEMENT_ELO,
  ELO_STEP_UP,
  ELO_STEP_DOWN,
  MIN_CALIBRATED_ELO,
  MAX_CALIBRATED_ELO,
} from '../lib/placementEngine';

describe('Unified Placement Engine Running Rating & Calibration', () => {
  it('starts at initial baseline rating of 1000', () => {
    const state = getInitialPlacementState();
    expect(state.currentStep).toBe(1);
    expect(state.currentPuzzleElo).toBe(INITIAL_PLACEMENT_ELO);
    expect(state.isComplete).toBe(false);
    expect(state.calibratedElo).toBeNull();
  });

  it('jumps +150 on every solve across 6 straight wins without end-of-test jump', () => {
    let state = getInitialPlacementState();
    const expectedTargets = [1000, 1150, 1300, 1450, 1600, 1750];

    for (let i = 0; i < 6; i++) {
      expect(state.currentPuzzleElo).toBe(expectedTargets[i]);
      state = processPlacementMove(state, `puzzle-${i}`, true);
    }

    expect(state.isComplete).toBe(true);
    expect(state.history.length).toBe(TOTAL_PLACEMENT_STEPS);
    // Running rating after 6 solves: 1000 + 6 * 150 = 1900
    expect(state.currentPuzzleElo).toBe(1900);
    expect(state.calibratedElo).toBe(1900);
  });

  it('drops -100 on blunder/failure', () => {
    let state = getInitialPlacementState(); // 1000
    state = processPlacementMove(state, 'p1', false); // drops to 900
    expect(state.currentPuzzleElo).toBe(900);
    expect(state.currentStep).toBe(2);

    state = processPlacementMove(state, 'p2', true); // rises +150 -> 1050
    expect(state.currentPuzzleElo).toBe(1050);
  });

  it('strictly steps +150 or -100, bypassing standard damped Glicko micro-deltas', () => {
    let state = getInitialPlacementState();
    const winState = processPlacementMove(state, 'p1', true);
    expect(winState.currentPuzzleElo - state.currentPuzzleElo).toBe(ELO_STEP_UP);

    const lossState = processPlacementMove(state, 'p1', false);
    expect(state.currentPuzzleElo - lossState.currentPuzzleElo).toBe(ELO_STEP_DOWN);
  });

  it('clamps final Elo within safe bounds [600, 2200]', () => {
    let lossState = getInitialPlacementState();
    for (let i = 0; i < 6; i++) {
      lossState = processPlacementMove(lossState, `p-${i}`, false);
    }
    expect(lossState.calibratedElo).toBe(MIN_CALIBRATED_ELO);

    // Test upper clamp
    let highState = {
      ...getInitialPlacementState(),
      currentPuzzleElo: 2150,
    };
    highState = processPlacementMove(highState, 'p-high-1', true);
    expect(highState.currentPuzzleElo).toBe(MAX_CALIBRATED_ELO);
  });

  it('calculates identical running rating via calculateFinalPlacementElo helper', () => {
    const history = [
      { puzzleId: 'p1', solved: true },
      { puzzleId: 'p2', solved: true },
      { puzzleId: 'p3', solved: false },
      { puzzleId: 'p4', solved: true },
      { puzzleId: 'p5', solved: true },
      { puzzleId: 'p6', solved: false },
    ];
    // 1000 + 150 + 150 - 100 + 150 + 150 - 100 = 1400
    const finalElo = calculateFinalPlacementElo(history);
    expect(finalElo).toBe(1400);
  });
});
