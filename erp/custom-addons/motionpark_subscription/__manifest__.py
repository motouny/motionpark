{
    'name': 'Motion Park Subscription',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park customer subscriptions with recurring billing',
    'author': 'Motion Park',
    'depends': ['sale', 'account', 'motionpark_membership', 'motionpark_customer'],
    'data': [
        'security/motionpark_subscription_security.xml',
        'security/ir.model.access.csv',
        'data/ir_sequence_data.xml',
        'data/ir_cron_data.xml',
        'views/motionpark_subscription_views.xml',
        'views/motionpark_subscription_menus.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
