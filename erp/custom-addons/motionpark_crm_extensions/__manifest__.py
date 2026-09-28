{
    'name': 'Motion Park CRM Extensions',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park extensions on CRM leads with idempotent lead creation',
    'author': 'Motion Park',
    'depends': ['crm', 'motionpark_customer'],
    'data': [
        'security/ir.model.access.csv',
        'views/crm_lead_views.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
