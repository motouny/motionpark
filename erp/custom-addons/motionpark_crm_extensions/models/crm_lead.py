from odoo import fields, models


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    motionpark_lead_type = fields.Selection(
        [
            ('contact', 'Contact'),
            ('callback', 'Callback'),
            ('trial', 'Trial'),
            ('membership_interest', 'Membership Interest'),
            ('general', 'General'),
        ],
        string='Motion Park Lead Type',
    )
    motionpark_branch_id = fields.Many2one('motionpark.branch', string='Motion Park Branch')
    motionpark_activity_id = fields.Many2one('motionpark.activity', string='Motion Park Activity')
    external_reference = fields.Char(index=True, copy=False)
