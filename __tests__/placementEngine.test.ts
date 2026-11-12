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

  it('sequentially transitions history.length from 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6, updating elo on every call and hard-locking on 6th', () => {
    let state = getInitialPlacementState();
    expect(state.history.length).toBe(0);
    expect(state.currentStep).toBe(1);
    expect(state.currentPuzzleElo).toBe(1000);
    expect(state.isComplete).toBe(false);

    // Call 1: Win (+150 -> 1150)
    state = processPlacementMove(state, 'puzzle-1', true);
    expect(state.history.length).toBe(1);
    expect(state.currentStep).toBe(2);
    expect(state.currentPuzzleElo).toBe(1150);
    expect(state.isComplete).toBe(false);

    // Call 2: Fail (-100 -> 1050)
    state = processPlacementMove(state, 'puzzle-2', false);
    expect(state.history.length).toBe(2);
    expect(state.currentStep).toBe(3);
    expect(state.currentPuzzleElo).toBe(1050);
    expect(state.isComplete).toBe(false);

    // Call 3: Win (+150 -> 1200)
    state = processPlacementMove(state, 'puzzle-3', true);
    expect(state.history.length).toBe(3);
    expect(state.currentStep).toBe(4);
    expect(state.currentPuzzleElo).toBe(1200);
    expect(state.isComplete).toBe(false);

    // Call 4: Win (+150 -> 1350)
    state = processPlacementMove(state, 'puzzle-4', true);
    expect(state.history.length).toBe(4);
    expect(state.currentStep).toBe(5);
    expect(state.currentPuzzleElo).toBe(1350);
    expect(state.isComplete).toBe(false);

    // Call 5: Fail (-100 -> 1250)
    state = processPlacementMove(state, 'puzzle-5', false);
    expect(state.history.length).toBe(5);
    expect(state.currentStep).toBe(6);
    expect(state.currentPuzzleElo).toBe(1250);
    expect(state.isComplete).toBe(false);

    // Call 6: Win (+150 -> 1400) -> Hard locks completion on 6th move!
    state = processPlacementMove(state, 'puzzle-6', true);
    expect(state.history.length).toBe(6);
    expect(state.currentStep).toBe(6);
    expect(state.currentPuzzleElo).toBe(1400);
    expect(state.calibratedElo).toBe(1400);
    expect(state.isComplete).toBe(true);

    // Call 7: Attempting 7th call is strictly ignored
    const state7 = processPlacementMove(state, 'puzzle-7', true);
    expect(state7.history.length).toBe(6);
    expect(state7.currentStep).toBe(6);
    expect(state7.currentPuzzleElo).toBe(1400);
    expect(state7.calibratedElo).toBe(1400);
    expect(state7.isComplete).toBe(true);
  });

  it('prevents duplicate scoring for the same puzzleId', () => {
    let state = getInitialPlacementState();
    state = processPlacementMove(state, 'p-same', true);
    expect(state.history.length).toBe(1);
    expect(state.currentPuzzleElo).toBe(1150);

    // Same puzzleId called again
    state = processPlacementMove(state, 'p-same', true);
    expect(state.history.length).toBe(1);
    expect(state.currentPuzzleElo).toBe(1150);
  });
});
