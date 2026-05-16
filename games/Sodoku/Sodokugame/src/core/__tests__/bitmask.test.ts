import { describe, it, expect } from 'vitest';
import {
  ALL_DIGITS, BIT, popcount, lowestBit, iterDigits,
  maskToArray, arrayToMask, boxIdx,
  emptyRegionMasks, regionMasksFromBoard, candidatesFor,
} from '../bitmask';
import { emptyBoard } from '../validator';

describe('bitmask', () => {
  it('BIT[d] sets the d-th bit', () => {
    expect(BIT[1]).toBe(0b10);
    expect(BIT[5]).toBe(0b100000);
    expect(BIT[9]).toBe(0b1000000000);
  });

  it('ALL_DIGITS covers exactly bits 1..9', () => {
    expect(popcount(ALL_DIGITS)).toBe(9);
    for (let d = 1; d <= 9; d++) expect(ALL_DIGITS & BIT[d]).toBeTruthy();
    expect(ALL_DIGITS & 1).toBe(0); // bit 0 unused
  });

  it('popcount counts set bits', () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(0b11111)).toBe(5);
    expect(popcount(ALL_DIGITS)).toBe(9);
  });

  it('lowestBit returns position of lowest set bit', () => {
    expect(lowestBit(BIT[3])).toBe(3);
    expect(lowestBit(BIT[1] | BIT[7])).toBe(1);
    expect(lowestBit(0)).toBe(0);
  });

  it('iterDigits yields ascending digits', () => {
    const m = BIT[2] | BIT[5] | BIT[9];
    expect([...iterDigits(m)]).toEqual([2, 5, 9]);
    expect([...iterDigits(0)]).toEqual([]);
  });

  it('maskToArray ↔ arrayToMask roundtrip', () => {
    const a = [1, 4, 7];
    const m = arrayToMask(a);
    expect(maskToArray(m)).toEqual(a);
  });

  it('boxIdx maps cell to its 3x3 box (0..8)', () => {
    expect(boxIdx(0, 0)).toBe(0);
    expect(boxIdx(0, 8)).toBe(2);
    expect(boxIdx(4, 4)).toBe(4);
    expect(boxIdx(8, 8)).toBe(8);
    expect(boxIdx(3, 0)).toBe(3);
  });

  it('regionMasksFromBoard tracks placements per region', () => {
    const m = emptyRegionMasks();
    expect(m.row[0]).toBe(0);
    const board = emptyBoard();
    board[0][0] = 5;
    board[8][8] = 1;
    const r = regionMasksFromBoard(board);
    expect(r.row[0] & BIT[5]).toBeTruthy();
    expect(r.col[0] & BIT[5]).toBeTruthy();
    expect(r.box[0] & BIT[5]).toBeTruthy();
    expect(r.box[8] & BIT[1]).toBeTruthy();
  });

  it('candidatesFor returns only digits not used by row/col/box peers', () => {
    const board = emptyBoard();
    board[0][0] = 1; // (1,1) peers: same box → excludes 1
    board[1][5] = 2; // (1,1) peers: same row → excludes 2
    board[7][1] = 3; // (1,1) peers: same col → excludes 3
    const m = regionMasksFromBoard(board);
    const cand = candidatesFor(m, 1, 1);
    expect(cand & BIT[1]).toBe(0); // box peer
    expect(cand & BIT[2]).toBe(0); // row peer
    expect(cand & BIT[3]).toBe(0); // col peer
    expect(cand & BIT[4]).toBeTruthy();
    expect(popcount(cand)).toBe(6); // {4,5,6,7,8,9}
  });
});
