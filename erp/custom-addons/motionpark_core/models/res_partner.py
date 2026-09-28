from odoo import fields, models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    motionpark_external_uuid = fields.Char(
        string='Platform Customer UUID',
        index=True,
        help='Platform customer UUID',
    )
    mobile_normalized = fields.Char(index=True)
    email_normalized = fields.Char(index=True)

    def init(self):
        super().init()
        # Partial unique indexes: several NULLs are allowed, values must be unique.
        self.env.cr.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS res_partner_mobile_normalized_uniq
            ON res_partner (mobile_normalized)
            WHERE mobile_normalized IS NOT NULL
        """)
        self.env.cr.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS res_partner_email_normalized_uniq
            ON res_partner (email_normalized)
            WHERE email_normalized IS NOT NULL
        """)
