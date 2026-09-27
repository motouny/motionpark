from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    is_motionpark_membership = fields.Boolean(string='Motion Park Membership')
    motionpark_name_ar = fields.Char(string='Name (Arabic)')
    motionpark_description_ar = fields.Text(string='Description (Arabic)')
    motionpark_description_en = fields.Text(string='Description (English)')
    membership_duration = fields.Integer(string='Membership Duration')
    duration_unit = fields.Selection(
        [('day', 'Day'), ('week', 'Week'), ('month', 'Month'), ('year', 'Year')],
        default='month',
    )
    session_limit = fields.Integer(default=0, help='Number of sessions included. 0 means unlimited.')
    branch_ids = fields.Many2many('motionpark.branch', string='Branches')
    motionpark_activity_ids = fields.Many2many('motionpark.activity', string='Motion Park Activities')
    age_min = fields.Integer(string='Minimum Age')
    age_max = fields.Integer(string='Maximum Age')
    gender_scope = fields.Selection(
        [('female', 'Female'), ('male', 'Male'), ('mixed', 'Mixed')],
        default='mixed',
    )
    online_available = fields.Boolean(default=True)
    website_featured = fields.Boolean()
    website_sort_order = fields.Integer(default=0)
    motionpark_list_price_with_vat = fields.Float(
        string='List Price With VAT',
        compute='_compute_motionpark_list_price_with_vat',
        compute_sudo=True,
    )

    @api.depends('list_price', 'taxes_id', 'company_id')
    def _compute_motionpark_list_price_with_vat(self):
        for product in self:
            price = product.list_price or 0.0
            if product.taxes_id:
                taxes = product.taxes_id.compute_all(
                    price,
                    currency=product.currency_id,
                    quantity=1.0,
                )
                price = taxes['total_included']
            product.motionpark_list_price_with_vat = price
