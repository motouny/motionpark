from odoo import fields, models


class MotionParkMembershipRule(models.Model):
    _name = 'motionpark.membership.rule'
    _description = 'Motion Park Membership Rule'

    name = fields.Char(required=True)
    description = fields.Text()
    session_limit = fields.Integer(
        default=0,
        help='Number of sessions included. 0 means unlimited.',
    )
    validity_days = fields.Integer(help='Validity of the membership in days')
    branch_ids = fields.Many2many('motionpark.branch', string='Branches')
    activity_ids = fields.Many2many('motionpark.activity', string='Activities')
    age_min = fields.Integer(string='Minimum Age')
    age_max = fields.Integer(string='Maximum Age')
    gender_scope = fields.Selection(
        [('female', 'Female'), ('male', 'Male'), ('mixed', 'Mixed')],
        default='mixed',
        required=True,
    )
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Membership rule name must be unique.'),
    ]
