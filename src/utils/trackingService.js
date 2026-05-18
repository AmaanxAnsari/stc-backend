// services/trackingService.js

/**
 * Tracking Event Service
 */

export const TrackingService = {
  /**
   * Create tracking event object
   */
  createEvent(status, notes = '', reason = '') {
    const now = new Date();

    const eventMap = {
      out_for_delivery: {
        id: 'out_for_delivery',
        label: 'Out for Delivery',
        icon: 'truck',
        color: '#2196F3',
      },
      delivered: {
        id: 'delivered',
        label: 'Delivered',
        icon: 'check-circle',
        color: '#4CAF50',
      },
      cancelled: {
        id: 'cancelled',
        label: 'Cancelled',
        icon: 'x-circle',
        color: '#F44336',
      },
    };

    const eventData = eventMap[status] || {};

    return {
      id: eventData.id || status,
      label: eventData.label || status,
      status: 'completed',
      timestamp: now,
      displayTime: now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      icon: eventData.icon || 'info',
      color: eventData.color || '#999',
      notes: notes,
      reason: reason,
    };
  },
};
