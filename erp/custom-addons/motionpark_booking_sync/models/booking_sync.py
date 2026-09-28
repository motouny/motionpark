from odoo import api, models
from odoo.exceptions import UserError


class MotionParkBookingSync(models.AbstractModel):
    _name = 'motionpark.booking.sync'
    _description = 'Motion Park Booking Sync Helper'

    @api.model
    def create_or_update(self, vals):
        """Create or update a booking idempotently on external_uuid."""
        vals = vals or {}
        if not isinstance(vals, dict):
            raise UserError('vals must be a dict')

        external_uuid = (str(vals.get('external_uuid') or '')).strip() or False
        Booking = self.env['motionpark.booking'].sudo()
        booking = self.env['motionpark.booking']
        if external_uuid:
            booking = Booking.search([('external_uuid', '=', external_uuid)], limit=1)

        booking_vals = {}
        if vals.get('branch_id'):
            booking_vals['branch_id'] = int(vals['branch_id'])
        if vals.get('activity_id'):
            booking_vals['activity_id'] = int(vals['activity_id'])
        if vals.get('coach_name'):
            booking_vals['coach_name'] = str(vals['coach_name'])
        if vals.get('schedule_date'):
            booking_vals['schedule_date'] = str(vals['schedule_date'])
        if vals.get('start_time') is not None:
            booking_vals['start_time'] = str(vals.get('start_time') or '')
        if vals.get('status'):
            booking_vals['status'] = vals['status']
        if vals.get('customer_partner_id'):
            booking_vals['customer_partner_id'] = int(vals['customer_partner_id'])
        elif vals.get('external_uuid_customer'):
            partner = self.env['motionpark.customer.sync'].sudo().find_or_create_partner({
                'external_uuid': vals.get('external_uuid_customer'),
                'name': vals.get('customer_name'),
                'email': vals.get('customer_email'),
                'mobile': vals.get('customer_mobile'),
            })
            booking_vals['customer_partner_id'] = partner['id']

        if booking:
            if booking_vals:
                booking.write(booking_vals)
            return {'id': booking.id, 'external_uuid': booking.external_uuid or '', 'created': False}

        booking_vals['external_uuid'] = external_uuid
        booking = Booking.create(booking_vals)
        return {'id': booking.id, 'external_uuid': booking.external_uuid or '', 'created': True}
