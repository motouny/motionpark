from odoo import api, fields, models


class MotionParkPaymentTransaction(models.Model):
    _name = 'motionpark.payment.transaction'
    _description = 'Motion Park Payment Transaction'
    _order = 'id desc'

    external_uuid = fields.Char(index=True)
    subscription_id = fields.Many2one('motionpark.subscription', string='Subscription', ondelete='set null')
    partner_id = fields.Many2one('res.partner', string='Customer')
    amount = fields.Float()
    currency_id = fields.Many2one('res.currency', string='Currency')
    provider = fields.Char()
    status = fields.Selection(
        [('initiated', 'Initiated'), ('success', 'Success'), ('failed', 'Failed')],
        default='initiated',
        required=True,
    )
    reference = fields.Char()

    def action_mark_success(self):
        for rec in self:
            rec.status = 'success'
            sub = rec.subscription_id
            if sub:
                sub.payment_status = 'paid'
                if sub.status == 'pending_payment':
                    sub.action_activate()

    def action_mark_failed(self):
        for rec in self:
            rec.status = 'failed'
            if rec.subscription_id and rec.subscription_id.payment_status == 'unpaid':
                rec.subscription_id.payment_status = 'failed'

    @api.model
    def register_payment(self, vals):
        """Register a payment from the platform (idempotent on external_uuid)."""
        vals = vals or {}
        external_uuid = (str(vals.get('external_uuid') or '')).strip() or False
        Tx = self.sudo()
        tx = self.env['motionpark.payment.transaction']
        if external_uuid:
            tx = Tx.search([('external_uuid', '=', external_uuid)], limit=1)
        status = vals.get('status') or 'initiated'
        tx_vals = {
            'status': status,
            'amount': float(vals.get('amount') or 0.0),
            'provider': str(vals.get('provider') or ''),
            'reference': str(vals.get('reference') or ''),
        }
        if vals.get('subscription_id'):
            tx_vals['subscription_id'] = int(vals['subscription_id'])
        if vals.get('partner_id'):
            tx_vals['partner_id'] = int(vals['partner_id'])
        if vals.get('currency_id'):
            tx_vals['currency_id'] = int(vals['currency_id'])
        if tx:
            tx.write(tx_vals)
        else:
            tx_vals['external_uuid'] = external_uuid
            tx = Tx.create(tx_vals)
        if status == 'success':
            tx.action_mark_success()
        return {'id': tx.id, 'status': tx.status}
