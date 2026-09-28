from odoo import api, fields, models


class MotionParkApi(models.AbstractModel):
    _name = 'motionpark.api'
    _description = 'Motion Park API Service'

    @api.model
    def ping(self):
        return {'ok': True, 'version': '19.0'}

    @api.model
    def get_membership_products(self):
        Product = self.env['product.template'].sudo()
        products = Product.search([
            ('is_motionpark_membership', '=', True),
            ('online_available', '=', True),
        ])
        result = []
        for p in products:
            result.append({
                'id': p.id,
                'name': p.name or '',
                'motionpark_name_ar': p.motionpark_name_ar or '',
                'motionpark_description_en': p.motionpark_description_en or '',
                'motionpark_description_ar': p.motionpark_description_ar or '',
                'list_price': float(p.list_price or 0.0),
                'list_price_with_vat': float(p.motionpark_list_price_with_vat or 0.0),
                'standard_price': float(p.standard_price or 0.0),
                'taxes': [{'name': t.name or '', 'amount': float(t.amount or 0.0)} for t in p.taxes_id],
                'membership_duration': p.membership_duration or 0,
                'duration_unit': p.duration_unit or '',
                'session_limit': p.session_limit or 0,
                'branches': [{'id': b.id, 'name': b.name or ''} for b in p.branch_ids],
                'activities': [{'id': a.id, 'name': a.name or ''} for a in p.motionpark_activity_ids],
                'age_min': p.age_min or 0,
                'age_max': p.age_max or 0,
                'gender_scope': p.gender_scope or '',
                'website_featured': bool(p.website_featured),
                'website_sort_order': p.website_sort_order or 0,
                'active': bool(p.active),
                'currency': p.company_id.currency_id.name or '',
            })
        return result

    @api.model
    def create_subscription(self, vals):
        vals = vals or {}
        if not isinstance(vals, dict):
            return {'error': 'vals must be a dict'}

        Subscription = self.env['motionpark.subscription'].sudo()
        external_reference = (str(vals.get('external_reference') or '')).strip() or False
        if external_reference:
            existing = Subscription.search([('external_reference', '=', external_reference)], limit=1)
            if existing:
                return {
                    'id': existing.id,
                    'name': existing.name,
                    'status': existing.status,
                    'created': False,
                }

        partner_info = vals.get('partner') or {}
        partner_res = self.env['motionpark.customer.sync'].sudo().find_or_create_partner({
            'external_uuid': partner_info.get('external_uuid'),
            'name': partner_info.get('name') or vals.get('partner_name'),
            'email': partner_info.get('email'),
            'mobile': partner_info.get('mobile'),
            'lang': partner_info.get('lang'),
        })

        product_id = vals.get('product_id')
        product = self.env['product.template'].sudo().browse(int(product_id)).exists() if product_id else self.env['product.template']
        if not product or not product.is_motionpark_membership:
            return {'error': 'invalid or missing product_id (membership product required)'}

        start = fields.Date.today()
        sub_vals = {
            'partner_id': partner_res['id'],
            'membership_product_id': product.id,
            'company_id': self.env.company.id,
            'start_date': start,
            'end_date': Subscription._add_duration(start, product),
            'billing_cycle': vals.get('billing_cycle') or 'once',
            'auto_renew': bool(vals.get('auto_renew')),
            'status': 'pending_payment',
            'external_reference': external_reference,
        }
        if vals.get('branch_ids'):
            sub_vals['branch_ids'] = [(6, 0, [int(i) for i in vals['branch_ids']])]
        if product.session_limit:
            sub_vals['remaining_sessions'] = product.session_limit

        sub = Subscription.create(sub_vals)
        return {
            'id': sub.id,
            'name': sub.name,
            'status': sub.status,
            'created': True,
        }

    @api.model
    def create_lead(self, vals):
        return self.env['motionpark.lead.sync'].sudo().create_lead(vals)
