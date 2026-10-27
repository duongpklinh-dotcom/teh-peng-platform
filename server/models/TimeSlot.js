/*
 * FEATURE: US #103 — Book a Consultation
 * OWNER: Book Consultation feature teammate
 *
 * BCE ENTITY: TimeSlot
 *
 * Attributes and method names follow the
 * approved BCE class diagram.
 *
 * DATABASE:
 * - timeSlots collection
 *
 * NOTE:
 * - UML integer IDs map to MongoDB ObjectIds.
 * - Implementation belongs to the feature owner.
 */

class TimeSlot {
  constructor() {
    this.slotId = null;
    this.designerId = null;
    this.startTime = null;
    this.endTime = null;
    this.isAvailable = true;
    this.matchScore = null;
  }

  getStartTime() {
    // TODO: Return start time.
    throw new Error('Not implemented');
  }

  getEndTime() {
    // TODO: Return end time.
    throw new Error('Not implemented');
  }

  getAvailability() {
    // TODO: Return availability.
    throw new Error('Not implemented');
  }

  setAvailability(isAvailable) {
    // TODO: Update availability.
    throw new Error('Not implemented');
  }

  setMatchScore(matchScore) {
    // TODO: Set time-slot match score.
    throw new Error('Not implemented');
  }
}

module.exports = TimeSlot;
