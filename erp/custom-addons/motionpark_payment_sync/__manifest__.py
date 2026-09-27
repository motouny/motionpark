{
    'name': 'Motion Park Payment Sync',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park payment transactions synced from the platform',
    'author': 'Motion Park',
    'depends': ['motionpark_subscription'],
    'data': [
        'security/ir.model.access.csv',
        'views/motionpark_payment_transaction_views.xml',
        'views/motionpark_payment_menus.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
