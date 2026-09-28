from odoo import api, fields, models


class MotionParkBooking(models.Model):
    _name = 'motionpark.booking'
    _description = 'Motion Park Booking'
    _order = 'schedule_date desc, id desc'

    external_uuid = fields.Char(index=True)
    branch_id = fields.Many2one('motionpark.branch', string='Branch')
    activity_id = fields.Many2one('motionpark.activity', string='Activity')
    coach_name = fields.Char()
    schedule_date = fields.Date(index=True)
    start_time = fields.Char()
    status = fields.Selection(
        [
            ('reserved', 'Reserved'),
            ('confirmed', 'Confirmed'),
            ('checked_in', 'Checked In'),
            ('cancelled', 'Cancelled'),
            ('no_show', 'No Show'),
            ('waiting_list', 'Waiting List'),
        ],
        default='reserved',
        required=True,
    )
    customer_partner_id = fields.Many2one('res.partner', string='Customer')

    _sql_constraints = [
        ('external_uuid_unique', 'unique(external_uuid)', 'Booking external UUID must be unique.'),
    ]
