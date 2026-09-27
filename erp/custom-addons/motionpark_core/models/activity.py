from odoo import fields, models


class MotionParkActivity(models.Model):
    _name = 'motionpark.activity'
    _description = 'Motion Park Activity'

    name = fields.Char(required=True)
    name_ar = fields.Char(string='Name (Arabic)')
    description = fields.Text()
    description_ar = fields.Text(string='Description (Arabic)')
    icon = fields.Char(help='Icon name or URL')
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Activity name must be unique.'),
    ]
