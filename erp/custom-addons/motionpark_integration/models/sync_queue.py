import json

from odoo import api, fields, models


class MotionParkSyncQueue(models.Model):
    _name = 'motionpark.sync.queue'
    _description = 'Motion Park Sync Queue'
    _order = 'id desc'

    name = fields.Char(default='New', required=True)
    entity = fields.Char(required=True)
    payload = fields.Text()
    status = fields.Selection(
        [('pending', 'Pending'), ('processing', 'Processing'), ('done', 'Done'), ('error', 'Error')],
        default='pending',
        required=True,
    )
    attempts = fields.Integer(default=0)
    next_attempt_at = fields.Datetime(default=fields.Datetime.now)
    last_error = fields.Text()
    transaction_id = fields.Char(index=True)

    @api.model
    def enqueue(self, entity, payload, transaction_id=False):
        """Add a payload to the sync queue (idempotent on transaction_id)."""
        transaction_id = (str(transaction_id or '')).strip() or False
        if transaction_id:
            existing = self.search([('transaction_id', '=', transaction_id)], limit=1)
            if existing:
                return existing.id
        if not isinstance(payload, str):
            payload = json.dumps(payload, ensure_ascii=False, default=str)
        return self.create({
            'name': transaction_id or 'New',
            'entity': entity,
            'payload': payload,
            'transaction_id': transaction_id,
        }).id
