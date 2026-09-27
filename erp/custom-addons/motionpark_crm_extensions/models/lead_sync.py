from odoo import api, models
from odoo.exceptions import UserError


class MotionParkLeadSync(models.AbstractModel):
    _name = 'motionpark.lead.sync'
    _description = 'Motion Park Lead Sync Helper'

    @api.model
    def create_lead(self, vals):
        """Create a CRM lead idempotently (on external_reference)."""
        vals = vals or {}
        if not isinstance(vals, dict):
            raise UserError('vals must be a dict')

        external_reference = (str(vals.get('external_reference') or '')).strip() or False
        Lead = self.env['crm.lead'].sudo()
        if external_reference:
            existing = Lead.search([('external_reference', '=', external_reference)], limit=1)
            if existing:
                return {'id': existing.id, 'name': existing.name, 'created': False}

        lead_vals = {
            'name': (str(vals.get('name') or '')).strip() or 'MotionPark Lead',
            'motionpark_lead_type': vals.get('lead_type') or 'general',
            'description': vals.get('description') or '',
        }
        if external_reference:
            lead_vals['external_reference'] = external_reference
        if vals.get('email'):
            lead_vals['email_from'] = str(vals.get('email')).strip()
        if vals.get('mobile'):
            lead_vals['phone'] = str(vals.get('mobile')).strip()
        if vals.get('phone'):
            lead_vals['phone'] = str(vals.get('phone')).strip()
        partner_id = vals.get('partner_id')
        if partner_id:
            lead_vals['partner_id'] = int(partner_id)
        elif vals.get('external_uuid'):
            partner = self.env['res.partner'].sudo().search(
                [('motionpark_external_uuid', '=', str(vals.get('external_uuid')).strip())], limit=1)
            if partner:
                lead_vals['partner_id'] = partner.id
        if vals.get('branch_id'):
            lead_vals['motionpark_branch_id'] = int(vals['branch_id'])
        if vals.get('activity_id'):
            lead_vals['motionpark_activity_id'] = int(vals['activity_id'])

        lead = Lead.create(lead_vals)
        return {'id': lead.id, 'name': lead.name, 'created': True}
