from dateutil.relativedelta import relativedelta

from odoo import api, fields, models


BILLING_CYCLE_MONTHS = {
    'monthly': 1,
    'quarterly': 3,
    'semi_annual': 6,
    'annual': 12,
}


class MotionParkSubscription(models.Model):
    _name = 'motionpark.subscription'
    _description = 'Motion Park Subscription'
    _order = 'id desc'

    name = fields.Char(required=True, copy=False, readonly=True, default='New')
    partner_id = fields.Many2one('res.partner', required=True, ondelete='restrict', index=True)
    membership_product_id = fields.Many2one(
        'product.template',
        string='Membership Product',
        domain="[('is_motionpark_membership', '=', True)]",
        required=True,
    )
    sale_order_id = fields.Many2one('sale.order', string='Source Sale Order', ondelete='set null', copy=False)
    company_id = fields.Many2one(
        'res.company',
        default=lambda self: self.env.company,
        required=True,
    )
    start_date = fields.Date(default=fields.Date.today)
    end_date = fields.Date()
    next_billing_date = fields.Date(index=True)
    billing_cycle = fields.Selection(
        [
            ('once', 'Once'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('semi_annual', 'Semi-Annual'),
            ('annual', 'Annual'),
            ('limited', 'Limited'),
        ],
        default='once',
        required=True,
    )
    status = fields.Selection(
        [
            ('draft', 'Draft'),
            ('pending_payment', 'Pending Payment'),
            ('active', 'Active'),
            ('paused', 'Paused'),
            ('expired', 'Expired'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft',
        required=True,
        index=True,
    )
    auto_renew = fields.Boolean(default=False)
    branch_ids = fields.Many2many('motionpark.branch', string='Branches')
    remaining_sessions = fields.Integer()
    external_reference = fields.Char(
        index=True,
        copy=False,
        help='MotionParkTransactionId — idempotency key',
    )
    payment_status = fields.Selection(
        [
            ('unpaid', 'Unpaid'),
            ('paid', 'Paid'),
            ('failed', 'Failed'),
            ('refunded', 'Refunded'),
        ],
        default='unpaid',
        required=True,
    )
    cancel_reason = fields.Char()
    last_billed_cycle_date = fields.Date(readonly=True, copy=False)
    is_expired = fields.Boolean(compute='_compute_is_expired', compute_sudo=True)

    _sql_constraints = [
        ('external_reference_unique', 'unique(external_reference)', 'External reference must be unique.'),
    ]

    @api.depends('end_date')
    def _compute_is_expired(self):
        today = fields.Date.today()
        for rec in self:
            rec.is_expired = bool(rec.end_date and rec.end_date < today)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('name') or vals.get('name') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('motionpark.subscription') or 'New'
        return super().create(vals_list)

    @api.model
    def _add_duration(self, start_date, product):
        if not start_date:
            return False
        if not product or not product.membership_duration:
            return start_date
        duration = product.membership_duration
        unit = product.duration_unit or 'month'
        if unit == 'day':
            return start_date + relativedelta(days=duration)
        if unit == 'week':
            return start_date + relativedelta(weeks=duration)
        if unit == 'year':
            return start_date + relativedelta(years=duration)
        return start_date + relativedelta(months=duration)

    def action_activate(self):
        today = fields.Date.today()
        for rec in self:
            start = rec.start_date or today
            end = rec.end_date or self._add_duration(start, rec.membership_product_id)
            rec.write({'status': 'active', 'start_date': start, 'end_date': end})

    def action_cancel(self):
        for rec in self:
            rec.write({'status': 'cancelled'})

    def action_pause(self):
        for rec in self:
            if rec.status == 'active':
                rec.write({'status': 'paused'})

    def action_resume(self):
        for rec in self:
            if rec.status == 'paused':
                rec.write({'status': 'active'})

    @api.model
    def create_from_order(self, sale_order_id):
        """Create a subscription from a confirmed sale order (idempotent)."""
        order = self.env['sale.order'].browse(sale_order_id).exists()
        if not order:
            return {'error': 'sale.order not found'}
        existing = self.search([('sale_order_id', '=', order.id)], limit=1)
        if existing:
            return {
                'id': existing.id,
                'name': existing.name,
                'status': existing.status,
                'created': False,
            }
        product = order.order_line.mapped('product_id.product_tmpl_id').filtered(
            lambda p: p.is_motionpark_membership
        )[:1]
        start = fields.Date.today()
        vals = {
            'partner_id': order.partner_id.id,
            'sale_order_id': order.id,
            'company_id': order.company_id.id or self.env.company.id,
            'start_date': start,
            'billing_cycle': 'once',
            'status': 'pending_payment',
        }
        if product:
            vals['membership_product_id'] = product.id
            vals['end_date'] = self._add_duration(start, product)
            if product.session_limit:
                vals['remaining_sessions'] = product.session_limit
            vals['branch_ids'] = [(6, 0, product.branch_ids.ids)]
        sub = self.create(vals)
        return {
            'id': sub.id,
            'name': sub.name,
            'status': sub.status,
            'created': True,
        }

    def _create_renewal_order(self):
        self.ensure_one()
        product_tmpl = self.membership_product_id
        product = product_tmpl.product_variant_id
        order = self.env['sale.order'].create({
            'partner_id': self.partner_id.id,
            'company_id': self.company_id.id,
            'origin': self.name,
            'order_line': [(0, 0, {
                'product_id': product.id,
                'product_uom_qty': 1.0,
                'price_unit': product_tmpl.list_price,
                'name': product_tmpl.name,
            })],
        })
        return order

    def _generate_renewal_order(self):
        self.ensure_one()
        today = fields.Date.today()
        cycle_start = self.next_billing_date or today
        # Idempotency guard: already billed for this cycle.
        if self.last_billed_cycle_date and self.last_billed_cycle_date >= cycle_start:
            return False
        self._create_renewal_order()
        months = BILLING_CYCLE_MONTHS.get(self.billing_cycle, 1)
        self.write({
            'next_billing_date': cycle_start + relativedelta(months=months),
            'last_billed_cycle_date': cycle_start,
            'payment_status': 'unpaid',
        })
        return True

    @api.model
    def _cron_generate_recurring(self):
        today = fields.Date.today()
        domain = [
            ('status', '=', 'active'),
            ('auto_renew', '=', True),
            ('next_billing_date', '<=', today),
            ('billing_cycle', 'in', list(BILLING_CYCLE_MONTHS.keys())),
        ]
        for rec in self.search(domain):
            try:
                rec._generate_renewal_order()
                self.env.cr.commit()
            except Exception:
                self.env.cr.rollback()

    @api.model
    def _cron_expire_subscriptions(self):
        today = fields.Date.today()
        subs = self.search([('status', 'in', ['active', 'paused']), ('end_date', '<', today)])
        subs.write({'status': 'expired'})
