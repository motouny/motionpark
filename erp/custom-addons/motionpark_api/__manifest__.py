{
    'name': 'Motion Park API',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park XML-RPC API service (ping, membership products, subscriptions, leads)',
    'author': 'Motion Park',
    'depends': ['motionpark_subscription', 'motionpark_crm_extensions'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
