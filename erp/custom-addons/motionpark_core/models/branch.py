from odoo import fields, models


class MotionParkBranch(models.Model):
    _name = 'motionpark.branch'
    _description = 'Motion Park Branch'

    name = fields.Char(required=True)
    name_ar = fields.Char(string='Name (Arabic)')
    city = fields.Char()
    address = fields.Text()
    latitude = fields.Float(digits=(10, 7))
    longitude = fields.Float(digits=(10, 7))
    phone = fields.Char()
    whatsapp = fields.Char()
    operating_hours = fields.Text()
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Branch name must be unique.'),
    ]
