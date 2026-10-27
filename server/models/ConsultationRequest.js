/*
 * FEATURE: US #103 — Book a Consultation
 * OWNER: Book Consultation feature teammate
 *
 * BCE ENTITY: ConsultationRequest
 *
 * Attributes and methods follow the
 * supplied BCE class diagram.
 *
 * DATABASE:
 * - consultations collection
 *
 * IMPORTANT:
 * - UML integer IDs map to MongoDB ObjectIds.
 * - Reuse existing users for Customer and InteriorDesigner.
 * - Business logic belongs to the feature owner.
 */

class ConsultationRequest {
  constructor() {
    this.requestId = null;
    this.customerId = null;
    this.designerId = null;
    this.slotId = null;
    this.renovationRequirements = null;
    this.requestStatus = 'Pending';
  }

  getRequestId() {
    // TODO: Return the consultation request ID.
    throw new Error('Not implemented');
  }

  getRequestStatus() {
    // TODO: Return the consultation request status.
    throw new Error('Not implemented');
  }
}

module.exports = ConsultationRequest;
