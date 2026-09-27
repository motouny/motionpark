{
    'name': 'Motion Park Booking Sync',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park booking mirror with idempotent sync from the platform',
    'author': 'Motion Park',
    'depends': ['motionpark_core'],
    'data': [
        'security/ir.model.access.csv',
        'views/motionpark_booking_views.xml',
        'views/motionpark_booking_menus.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
