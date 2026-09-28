from odoo import api, fields, models


class MotionParkIntegrationLog(models.Model):
    _name = 'motionpark.integration.log'
    _description = 'Motion Park Integration Log'
    _order = 'id desc'

    direction = fields.Selection(
        [('in', 'Incoming'), ('out', 'Outgoing')],
        required=True,
    )
    entity = fields.Char(required=True)
    operation = fields.Char()
    local_id = fields.Char()
    odoo_id = fields.Integer()
    status = fields.Selection(
        [('success', 'Success'), ('error', 'Error'), ('pending', 'Pending')],
        default='pending',
        required=True,
    )
    attempt = fields.Integer(default=1)
    error = fields.Text()
    transaction_id = fields.Char(index=True)

    @api.model
    def log(self, direction, entity, operation=False, status='success',
            local_id=False, odoo_id=False, transaction_id=False, error=False, attempt=1):
        return self.create({
            'direction': direction,
            'entity': entity,
            'operation': operation or '',
            'status': status,
            'local_id': local_id or '',
            'odoo_id': int(odoo_id) if odoo_id else False,
            'transaction_id': transaction_id or '',
            'error': error or '',
            'attempt': attempt or 1,
        })
