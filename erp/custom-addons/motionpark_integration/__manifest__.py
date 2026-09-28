{
    'name': 'Motion Park Integration',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park integration logs and sync queue',
    'author': 'Motion Park',
    'depends': ['motionpark_api'],
    'data': [
        'security/ir.model.access.csv',
        'views/integration_log_views.xml',
        'views/sync_queue_views.xml',
        'views/motionpark_integration_menus.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
