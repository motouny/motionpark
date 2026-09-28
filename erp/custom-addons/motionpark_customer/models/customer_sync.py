import re

from odoo import api, fields, models
from odoo.exceptions import UserError


def normalize_mobile(mobile):
    """Normalize a mobile number to international format.

    - strip spaces, dashes, parentheses
    - '05XXXXXXXX' -> '+9665XXXXXXXX' (drop leading 0, keep the 5)
    - '5XXXXXXXX'  -> '+9665XXXXXXXX'
    - otherwise keep digits and leading '+'
    """
    if not mobile:
        return False
    val = re.sub(r'[\s\-\(\)\.]', '', str(mobile))
    if not val:
        return False
    if val.startswith('05'):
        val = '+966' + val[1:]
    elif val.startswith('5'):
        val = '+966' + val
    return val


def normalize_email(email):
    if not email:
        return False
    val = str(email).strip().lower()
    return val or False


class MotionParkCustomerSync(models.AbstractModel):
    _name = 'motionpark.customer.sync'
    _description = 'Motion Park Customer Sync Helper'

    @api.model
    def _normalize_mobile(self, mobile):
        return normalize_mobile(mobile)

    @api.model
    def _normalize_email(self, email):
        return normalize_email(email)

    @api.model
    def find_or_create_partner(self, vals):
        """Find or create a res.partner from platform data.

        Idempotent: retries never create duplicates. Lookup order:
        external UUID -> normalized mobile -> normalized email.
        """
        vals = vals or {}
        if not isinstance(vals, dict):
            raise UserError('vals must be a dict')

        external_uuid = (str(vals.get('external_uuid') or '')).strip() or False
        email_raw = (str(vals.get('email') or '')).strip()
        email_norm = normalize_email(email_raw)
        mobile_raw = (str(vals.get('mobile') or '')).strip()
        mobile_norm = normalize_mobile(mobile_raw)
        name = (str(vals.get('name') or '')).strip() or 'MotionPark Customer'
        lang = (str(vals.get('lang') or '')).strip() or False

        Partner = self.env['res.partner'].sudo()
        partner = self.env['res.partner']
        if external_uuid:
            partner = Partner.search([('motionpark_external_uuid', '=', external_uuid)], limit=1)
        if not partner and mobile_norm:
            partner = Partner.search([('mobile_normalized', '=', mobile_norm)], limit=1)
        if not partner and email_norm:
            partner = Partner.search([('email_normalized', '=', email_norm)], limit=1)

        if partner:
            update_vals = {}
            if external_uuid and not partner.motionpark_external_uuid:
                update_vals['motionpark_external_uuid'] = external_uuid
            if mobile_norm and not partner.mobile_normalized:
                update_vals['mobile_normalized'] = mobile_norm
            if email_norm and not partner.email_normalized:
                update_vals['email_normalized'] = email_norm
            if email_raw and not partner.email:
                update_vals['email'] = email_raw
            if mobile_raw and not partner.phone:
                update_vals['phone'] = mobile_raw
            if (not partner.name or partner.name == 'MotionPark Customer') and name != 'MotionPark Customer':
                update_vals['name'] = name
            if lang and not partner.lang:
                update_vals['lang'] = lang
            if update_vals:
                partner.write(update_vals)
            return {
                'id': partner.id,
                'name': partner.name,
                'external_uuid': partner.motionpark_external_uuid or '',
                'created': False,
            }

        create_vals = {
            'name': name,
            'is_company': False,
            'motionpark_external_uuid': external_uuid,
            'mobile_normalized': mobile_norm,
            'email_normalized': email_norm,
        }
        if email_raw:
            create_vals['email'] = email_raw
        if mobile_raw:
            create_vals['phone'] = mobile_raw
        if lang:
            create_vals['lang'] = lang
        partner = Partner.create(create_vals)
        return {
            'id': partner.id,
            'name': partner.name,
            'external_uuid': partner.motionpark_external_uuid or '',
            'created': True,
        }
