
import { describe, it, expect } from 'vitest';
import ConsultationController from '../controllers/ConsultationController.js';

describe('Consultation Booking - Scheduling Conflict Detection', () => {

  const controller = new ConsultationController(null, null);

  it('TC-UT01: detects overlapping consultation times', () => {
    const newStart = new Date('2026-12-10T10:30:00+08:00');
    const newEnd = new Date('2026-12-10T11:30:00+08:00');

    const existingSlot = {
      startTime: new Date('2026-12-10T10:00:00+08:00'),
      endTime: new Date('2026-12-10T11:00:00+08:00')
    };

    const result = controller.overlaps(
      newStart,
      newEnd,
      existingSlot
    );

    expect(result).toBe(true);
  });

  it('TC-UT02: allows non-overlapping consultation times', () => {
    const newStart = new Date('2026-12-10T11:00:00+08:00');
    const newEnd = new Date('2026-12-10T12:00:00+08:00');

    const existingSlot = {
      startTime: new Date('2026-12-10T10:00:00+08:00'),
      endTime: new Date('2026-12-10T11:00:00+08:00')
    };

    const result = controller.overlaps(
      newStart,
      newEnd,
      existingSlot
    );

    expect(result).toBe(false);
  });

  it('TC-UT03: detects identical appointment times', () => {
    const newStart = new Date('2026-12-10T10:00:00+08:00');
    const newEnd = new Date('2026-12-10T11:00:00+08:00');

    const existingSlot = {
      startTime: new Date('2026-12-10T10:00:00+08:00'),
      endTime: new Date('2026-12-10T11:00:00+08:00')
    };

    const result = controller.overlaps(
      newStart,
      newEnd,
      existingSlot
    );

    expect(result).toBe(true);
  });
 
describe('Consultation Booking - Renovation Requirements Validation', () => {

  const controller = new ConsultationController(null, null);

  it('TC-UT04: accepts valid renovation requirements', () => {
    const result = controller.validateRequirements(
      'I want to renovate my living room.'
    );

    expect(result).toBe('I want to renovate my living room.');
  });

  it('TC-UT05: rejects empty renovation requirements', () => {
    expect(() => {
      controller.validateRequirements('');
    }).toThrow('Invalid renovation requirements.');
  });

  it('TC-UT06: rejects whitespace-only requirements', () => {
    expect(() => {
      controller.validateRequirements('   ');
    }).toThrow('Invalid renovation requirements.');
  });

  it('TC-UT07: rejects requirements exceeding 2000 characters', () => {
    const longRequirements = 'A'.repeat(2001);

    expect(() => {
      controller.validateRequirements(longRequirements);
    }).toThrow('Invalid renovation requirements.');
  });

});
 
describe('Consultation Booking - Designer Working Hours', () => {

  const controller = new ConsultationController(null, null);

  const schedule = {
    weeklySchedule: [
      {
        dayOfWeek: 4, // Thursday
        isWorking: true,
        startTime: '09:00',
        endTime: '17:00'
      }
    ],
    dateOverrides: []
  };

  it('TC-UT08: allows appointments within working hours', () => {
    const start = new Date('2026-12-10T10:00:00+08:00');
    const end = new Date('2026-12-10T11:00:00+08:00');

    expect(
      controller.fitsWorkingHours(start, end, schedule)
    ).toBe(true);
  });

  it('TC-UT09: rejects appointments before opening hours', () => {
    const start = new Date('2026-12-10T08:00:00+08:00');
    const end = new Date('2026-12-10T09:00:00+08:00');

    expect(
      controller.fitsWorkingHours(start, end, schedule)
    ).toBe(false);
  });

  it('TC-UT10: rejects appointments after closing hours', () => {
    const start = new Date('2026-12-10T16:30:00+08:00');
    const end = new Date('2026-12-10T17:30:00+08:00');

    expect(
      controller.fitsWorkingHours(start, end, schedule)
    ).toBe(false);
  });

  it('TC-UT11: rejects appointments on unavailable days', () => {
    // Friday is not configured as a working day.
    const start = new Date('2026-12-11T10:00:00+08:00');
    const end = new Date('2026-12-11T11:00:00+08:00');

    expect(
      controller.fitsWorkingHours(start, end, schedule)
    ).toBe(false);
  });

});
 
describe('Consultation Booking - Smart Slot Recommendations', () => {

  const controller = new ConsultationController(null, null);

  const morningSlot = {
    startTime: '2026-12-10T10:00:00+08:00'
  };

  const afternoonSlot = {
    startTime: '2026-12-10T14:00:00+08:00'
  };

  it('TC-UT12: prioritises morning slots for morning preference', () => {
    const result = controller.calculateSlotScore(
      morningSlot,
      'morning'
    );

    expect(result).toBe(100);
  });

  it('TC-UT13: assigns lower score to afternoon slots for morning preference', () => {
    const result = controller.calculateSlotScore(
      afternoonSlot,
      'morning'
    );

    expect(result).toBe(50);
  });

  it('TC-UT14: prioritises afternoon slots for afternoon preference', () => {
    const result = controller.calculateSlotScore(
      afternoonSlot,
      'afternoon'
    );

    expect(result).toBe(100);
  });

  it('TC-UT15: assigns lower score to morning slots for afternoon preference', () => {
    const result = controller.calculateSlotScore(
      morningSlot,
      'afternoon'
    );

    expect(result).toBe(50);
  });

});
 
describe('Consultation Booking - Duration Validation (TDD)', () => {

  const controller = new ConsultationController(null, null);

  it('TC-UT16: accepts a consultation lasting exactly 60 minutes', () => {
    const start = new Date('2026-12-10T10:00:00+08:00');
    const end = new Date('2026-12-10T11:00:00+08:00');

    expect(controller.isValidDuration(start, end)).toBe(true);
  });

  it('TC-UT17: rejects a consultation shorter than 60 minutes', () => {
    const start = new Date('2026-12-10T10:00:00+08:00');
    const end = new Date('2026-12-10T10:30:00+08:00');

    expect(controller.isValidDuration(start, end)).toBe(false);
  });

  it('TC-UT18: rejects a consultation longer than 60 minutes', () => {
    const start = new Date('2026-12-10T10:00:00+08:00');
    const end = new Date('2026-12-10T11:30:00+08:00');

    expect(controller.isValidDuration(start, end)).toBe(false);
  });

  it('TC-UT19: rejects an end time before the start time', () => {
    const start = new Date('2026-12-10T11:00:00+08:00');
    const end = new Date('2026-12-10T10:00:00+08:00');

    expect(controller.isValidDuration(start, end)).toBe(false);
  });

});

});
